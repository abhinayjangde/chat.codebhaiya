import { ObjectId } from "mongodb";
import { env } from "../config/env.js";
import { HttpError } from "../lib/validation.js";
import { UsagePeriod } from "../models/usage.model.js";
import { UsageDay } from "../models/usage-day.model.js";

export interface UsageCounters {
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  uploadCount: number;
  uploadBytes: number;
  imageGenerationCount: number;
  expensiveModelCallCount: number;
}

export type UsageAction =
  | "message"
  | "upload"
  | "image_generation"
  | "expensive_model";

export interface UsageDelta {
  messageCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  uploadCount?: number;
  uploadBytes?: number;
  imageGenerationCount?: number;
  expensiveModelCallCount?: number;
}

export interface MonthlyQuota {
  messages: number;
  uploads: number;
  uploadBytes: number;
  imageGenerations: number;
  expensiveModelCalls: number;
}

export interface UsageMetrics {
  messages: number;
  inputTokens: number;
  outputTokens: number;
  uploads: number;
  uploadBytes: number;
  imageGenerations: number;
  expensiveModelCalls: number;
}

export interface UsageSummary {
  period: string;
  daily: {
    period: string;
    usage: UsageMetrics;
  };
  usage: UsageMetrics;
  quotas: MonthlyQuota;
}

/** "YYYY-MM" period string (UTC) for a given date. */
export function getUsagePeriod(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

/** "YYYY-MM-DD" period string (UTC) for a given date. */
export function getUsageDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getMonthlyQuota(): MonthlyQuota {
  return {
    messages: env.USAGE_MAX_MESSAGES_PER_MONTH,
    uploads: env.USAGE_MAX_UPLOADS_PER_MONTH,
    uploadBytes: env.USAGE_MAX_UPLOAD_BYTES_PER_MONTH,
    imageGenerations: env.USAGE_MAX_IMAGE_GENERATIONS_PER_MONTH,
    expensiveModelCalls: env.USAGE_MAX_EXPENSIVE_MODEL_CALLS_PER_MONTH,
  };
}

async function getUsageDocument(
  userId: string,
  period: string
): Promise<UsageCounters> {
  const usage = await UsagePeriod.findOne({ userId: new ObjectId(userId), period })
    .lean<UsageCounters | null>();

  return {
    messageCount: usage?.messageCount ?? 0,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    uploadCount: usage?.uploadCount ?? 0,
    uploadBytes: usage?.uploadBytes ?? 0,
    imageGenerationCount: usage?.imageGenerationCount ?? 0,
    expensiveModelCallCount: usage?.expensiveModelCallCount ?? 0,
  };
}

/**
 * Enforce the monthly quota for an action before the work is performed.
 * Throws HttpError 429 (usage quota exceeded) when the request would exceed
 * the caller's monthly allowance.
 */
export async function enforceUsageQuota(
  userId: string,
  action: UsageAction
): Promise<void> {
  const period = getUsagePeriod();
  const current = await getUsageDocument(userId, period);
  const quota = getMonthlyQuota();

  const exceeded =
    (action === "message" && current.messageCount >= quota.messages) ||
    (action === "upload" &&
      (current.uploadCount >= quota.uploads ||
        current.uploadBytes >= quota.uploadBytes)) ||
    (action === "image_generation" &&
      current.imageGenerationCount >= quota.imageGenerations) ||
    (action === "expensive_model" &&
      current.expensiveModelCallCount >= quota.expensiveModelCalls);

  if (exceeded) {
    throw new HttpError(429, buildQuotaMessage(action, quota));
  }
}

/**
 * Atomically increment monthly usage counters. Called once per billable
 * operation (after the counter has been reserved via enforceUsageQuota).
 */
export async function recordUsage(userId: string, delta: UsageDelta): Promise<void> {
  const period = getUsagePeriod();
  const day = getUsageDay();
  const increments = {
    ...(delta.messageCount ? { messageCount: delta.messageCount } : {}),
    ...(delta.inputTokens ? { inputTokens: delta.inputTokens } : {}),
    ...(delta.outputTokens ? { outputTokens: delta.outputTokens } : {}),
    ...(delta.uploadCount ? { uploadCount: delta.uploadCount } : {}),
    ...(delta.uploadBytes ? { uploadBytes: delta.uploadBytes } : {}),
    ...(delta.imageGenerationCount
      ? { imageGenerationCount: delta.imageGenerationCount }
      : {}),
    ...(delta.expensiveModelCallCount
      ? { expensiveModelCallCount: delta.expensiveModelCallCount }
      : {}),
  };

  const ownerId = new ObjectId(userId);
  await Promise.all([
    UsagePeriod.findOneAndUpdate(
      { userId: ownerId, period },
      { $inc: increments },
      { upsert: true, new: true }
    ),
    UsageDay.findOneAndUpdate(
      { userId: ownerId, day },
      { $inc: increments },
      { upsert: true, new: true }
    ),
  ]);
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const period = getUsagePeriod();
  const day = getUsageDay();
  const [current, today] = await Promise.all([
    getUsageDocument(userId, period),
    UsageDay.findOne({ userId: new ObjectId(userId), day })
      .lean<UsageCounters | null>(),
  ]);

  const todayUsage = {
    messages: today?.messageCount ?? 0,
    inputTokens: today?.inputTokens ?? 0,
    outputTokens: today?.outputTokens ?? 0,
    uploads: today?.uploadCount ?? 0,
    uploadBytes: today?.uploadBytes ?? 0,
    imageGenerations: today?.imageGenerationCount ?? 0,
    expensiveModelCalls: today?.expensiveModelCallCount ?? 0,
  };

  return {
    period,
    daily: { period: day, usage: todayUsage },
    usage: {
      messages: current.messageCount,
      inputTokens: current.inputTokens,
      outputTokens: current.outputTokens,
      uploads: current.uploadCount,
      uploadBytes: current.uploadBytes,
      imageGenerations: current.imageGenerationCount,
      expensiveModelCalls: current.expensiveModelCallCount,
    },
    quotas: getMonthlyQuota(),
  };
}

function buildQuotaMessage(action: UsageAction, quota: MonthlyQuota): string {
  const resets = `Limits reset at the start of each month.`;
  switch (action) {
    case "message":
      return `Monthly message limit of ${quota.messages} reached. ${resets}`;
    case "upload":
      return `Monthly upload limit reached (${quota.uploads} files or ${quota.uploadBytes} bytes). ${resets}`;
    case "image_generation":
      return `Monthly image generation limit of ${quota.imageGenerations} reached. ${resets}`;
    case "expensive_model":
      return `Monthly limit of ${quota.expensiveModelCalls} document analysis summaries reached. ${resets}`;
  }
}
