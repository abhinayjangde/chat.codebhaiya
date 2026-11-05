import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URL: z.string().trim().min(1, "MONGODB_URL is required"),

  OPENAI_API_KEY: z.string().trim().optional(),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-5-nano-2025-08-07"),
  GROQ_API_KEY: z.string().trim().optional(),
  JWT_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY: z.string().trim().min(1).default("15m"),
  JWT_REFRESH_EXPIRY: z.string().trim().min(1).default("7d"),
  CORS_ORIGINS: z.string().trim().min(1, "CORS_ORIGINS is required"),
  RESEND_API_KEY: z.string().trim().optional(),
  AUTH_EMAIL_FROM: z.string().trim().email().optional(),
  APP_BASE_URL: z.string().trim().url().optional(),
  GOOGLE_API_KEY: z.string().trim().optional(),
  GOOGLE_IMAGE_MODEL: z.string().trim().default("gemini-3.1-flash-image"),
  GOOGLE_EMBEDDING_MODEL: z.string().trim().default("gemini-embedding-2"),
  AWS_REGION: z.string().trim().default("us-east-1"),
  AWS_S3_BUCKET: z.string().trim().optional(),
  AWS_S3_ENDPOINT: z.string().trim().url().optional(),
  QDRANT_URL: z.string().trim().url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().trim().optional(),
  QDRANT_COLLECTION: z.string().trim().default("chat_documents"),
  REDIS_URL: z.string().trim().url().default("redis://localhost:6379"),
  DOCUMENT_QUEUE_NAME: z.string().trim().default("document-processing"),
  OLLAMA_API_KEY: z.string().trim().optional(),
  OLLAMA_BASE_URL: z.string().trim().default("https://api.ollama.com"),
  SARVAM_API_KEY: z.string().trim().optional(),
  MODEL_NAME: z.string().trim().optional(),
  MAX_MCP_SERVERS_PER_USER: z.coerce.number().int().min(1).max(20).default(5),
  // Render sets this automatically for every deployed service
  RENDER_EXTERNAL_URL: z.string().trim().optional(),

  // API protection (unrestricted resource consumption)
  RATE_LIMITING_ENABLED: z
    .string()
    .default("true")
    .transform((value) => value !== "false"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_CHAT_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_READ_MAX: z.coerce.number().int().min(1).default(120),

  // Monthly per-account usage quotas
  USAGE_MAX_MESSAGES_PER_MONTH: z.coerce.number().int().min(1).default(1_000),
  USAGE_MAX_UPLOADS_PER_MONTH: z.coerce.number().int().min(1).default(200),
  USAGE_MAX_UPLOAD_BYTES_PER_MONTH: z.coerce.number().int().min(1).default(2 * 1024 * 1024 * 1024),
  USAGE_MAX_IMAGE_GENERATIONS_PER_MONTH: z.coerce.number().int().min(1).default(100),
  USAGE_MAX_EXPENSIVE_MODEL_CALLS_PER_MONTH: z.coerce.number().int().min(1).default(500),
});

const parsed = envSchema.superRefine((config, context) => {
  if (config.NODE_ENV === "production") {
    if (!config.RESEND_API_KEY) {
      context.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required in production" });
    }
    if (!config.AUTH_EMAIL_FROM) {
      context.addIssue({ code: "custom", path: ["AUTH_EMAIL_FROM"], message: "AUTH_EMAIL_FROM is required in production" });
    }
    if (!config.APP_BASE_URL) {
      context.addIssue({ code: "custom", path: ["APP_BASE_URL"], message: "APP_BASE_URL is required in production" });
    } else if (!config.APP_BASE_URL.startsWith("https://")) {
      context.addIssue({ code: "custom", path: ["APP_BASE_URL"], message: "APP_BASE_URL must use HTTPS in production" });
    }
  }
}).safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}

/**
 * Array of allowed CORS origins with whitespace trimmed and empty strings removed.
 * The `.filter(Boolean)` removes any empty strings that may result from the split operation,
 * ensuring only valid origin strings are included in the array.
 */
const corsOrigins = parsed.data.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  throw new Error("Invalid environment configuration:\nCORS_ORIGINS must include at least one origin");
}

export const env = Object.freeze({
  ...parsed.data,
  corsOrigins,
});

export type AppEnv = typeof env;
