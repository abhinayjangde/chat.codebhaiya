import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { IUser } from "../models/user.model.js";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { AuthSession } from "../models/auth-session.model.js";
import { DocumentCollection } from "../models/document-collection.model.js";
import { McpServer } from "../models/mcp-server.model.js";
import { Resume } from "../models/resume.model.js";
import { env } from "../config/env.js";
import { cleanupDocumentsForUser } from "./document-cleanup.service.js";
import { deleteDocumentFromS3 } from "./storage.service.js";

const JWT_SECRET = env.JWT_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const JWT_ACCESS_EXPIRY = env.JWT_ACCESS_EXPIRY;
const JWT_REFRESH_EXPIRY = env.JWT_REFRESH_EXPIRY;

export const ACCOUNT_RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class AccountPendingDeletionError extends Error {
  readonly code = "ACCOUNT_PENDING_DELETION";
  readonly deletionScheduledAt: Date;

  constructor(message: string, deletionScheduledAt: Date) {
    super(message);
    this.name = "AccountPendingDeletionError";
    this.deletionScheduledAt = deletionScheduledAt;
  }
}

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId: string;
}

export interface SessionMetadata {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface FormattedSession {
  sessionId: string;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
  browser: string;
  os: string;
  device: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  metadata?: SessionMetadata
): Promise<{ user: IUser; tokens: AuthTokens }> {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    if (existingUser.status === "pending_deletion") {
      if (
        existingUser.deletionScheduledAt &&
        existingUser.deletionScheduledAt.getTime() <= Date.now()
      ) {
        // Expired pending deletion: purge and allow new registration
        await permanentlyDeleteUserAccount(existingUser._id.toString());
      } else {
        throw new Error(
          "An account with this email is scheduled for deletion. Please log in to recover it or wait until the 30-day period expires."
        );
      }
    } else {
      throw new Error("User already exists with this email");
    }
  }

  let user: IUser;
  try {
    user = await User.create({
      email: normalizedEmail,
      password,
      name,
      status: "active",
      deletedAt: null,
      deletionScheduledAt: null,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new Error("User already exists with this email");
    }
    throw error;
  }

  const tokens = await issueTokens(user, undefined, metadata);
  return { user, tokens };
}

export async function loginUser(
  email: string,
  password: string,
  metadata?: SessionMetadata
): Promise<{ user: IUser; tokens: AuthTokens }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.status === "pending_deletion") {
    if (
      user.deletionScheduledAt &&
      user.deletionScheduledAt.getTime() <= Date.now()
    ) {
      // 30-day window expired: permanently delete and reject
      await permanentlyDeleteUserAccount(user._id.toString());
      throw new Error("Invalid credentials");
    }

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    throw new AccountPendingDeletionError(
      "Your account is deactivated and scheduled for deletion. You can recover it within 30 days.",
      user.deletionScheduledAt ?? new Date(Date.now() + ACCOUNT_RECOVERY_WINDOW_MS)
    );
  }

  const isMatch = await (user as any).comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const tokens = await issueTokens(user, undefined, metadata);
  return { user, tokens };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getTokenExpiryDate(token: string): Date {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object" || typeof decoded.exp !== "number") {
    throw new Error("Generated token has no expiration");
  }

  return new Date(decoded.exp * 1_000);
}

function generateTokens(user: IUser, sessionId: string): AuthTokens {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    sessionId,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY as any,
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY as any,
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as Partial<TokenPayload>;
  if (
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    throw new Error("Invalid access token payload");
  }

  return payload as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET) as Partial<TokenPayload>;
  if (
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    throw new Error("Invalid refresh token payload");
  }

  return payload as TokenPayload;
}

async function issueTokens(
  user: IUser,
  sessionId: string = crypto.randomUUID(),
  metadata?: SessionMetadata
): Promise<AuthTokens> {
  const tokens = generateTokens(user, sessionId);

  const setDoc: Record<string, any> = {
    userId: user._id,
    refreshTokenHash: hashToken(tokens.refreshToken),
    expiresAt: getTokenExpiryDate(tokens.refreshToken),
    lastActiveAt: new Date(),
  };

  if (metadata?.userAgent) {
    setDoc.userAgent = metadata.userAgent;
  }
  if (metadata?.ipAddress) {
    setDoc.ipAddress = metadata.ipAddress;
  }

  await AuthSession.findOneAndUpdate(
    { sessionId },
    {
      $set: setDoc,
      $unset: { revokedAt: 1 },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return tokens;
}

export async function isSessionActive(sessionId: string, userId: string): Promise<boolean> {
  const session = await AuthSession.findOne({
    sessionId,
    userId: new mongoose.Types.ObjectId(userId),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .select("_id lastActiveAt")
    .lean();

  if (!session) {
    return false;
  }

  const user = await User.findById(userId).select("status").lean();
  if (!user || user.status === "pending_deletion") {
    return false;
  }

  const now = Date.now();
  if (!session.lastActiveAt || now - new Date(session.lastActiveAt).getTime() > 60_000) {
    void AuthSession.updateOne({ _id: session._id }, { $set: { lastActiveAt: new Date() } }).exec();
  }

  return true;
}

export async function refreshTokens(
  refreshToken: string,
  metadata?: SessionMetadata
): Promise<AuthTokens> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user || user.status === "pending_deletion") {
      throw new Error("User not found or account is deactivated");
    }

    const session = await AuthSession.findOneAndUpdate(
      {
        sessionId: payload.sessionId,
        userId: user._id,
        refreshTokenHash: hashToken(refreshToken),
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      { $set: { revokedAt: new Date() } },
      { returnDocument: "before" }
    );

    if (!session) {
      throw new Error("Refresh token has been revoked");
    }

    return issueTokens(user, payload.sessionId, metadata);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
}

export function parseUserAgentString(ua?: string): { browser: string; os: string; device: string } {
  if (!ua) {
    return { browser: "Unknown browser", os: "Unknown OS", device: "Desktop" };
  }

  let browser = "Unknown browser";
  if (ua.includes("Firefox/")) {
    browser = "Firefox";
  } else if (ua.includes("Edg/")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("Chrome/") && !ua.includes("Chromium/")) {
    browser = "Chrome";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari";
  } else if (ua.includes("Opera/") || ua.includes("OPR/")) {
    browser = "Opera";
  }

  let os = "Unknown OS";
  if (ua.includes("Windows NT 10.0") || ua.includes("Windows NT 11.0")) {
    os = "Windows 10/11";
  } else if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")) {
    os = "iOS";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  let device = "Desktop";
  if (/mobile|android|iphone|ipod/i.test(ua)) {
    device = "Mobile";
  } else if (/ipad|tablet/i.test(ua)) {
    device = "Tablet";
  }

  return { browser, os, device };
}

export async function getUserSessions(userId: string, currentSessionId: string): Promise<FormattedSession[]> {
  const sessions = await AuthSession.find({
    userId: new mongoose.Types.ObjectId(userId),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastActiveAt: -1, updatedAt: -1, createdAt: -1 })
    .lean();

  return sessions.map((s) => {
    const parsed = parseUserAgentString(s.userAgent);
    return {
      sessionId: s.sessionId,
      isCurrent: s.sessionId === currentSessionId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      lastActiveAt: s.lastActiveAt ?? s.updatedAt ?? s.createdAt,
      expiresAt: s.expiresAt,
      ...(s.userAgent ? { userAgent: s.userAgent } : {}),
      ...(s.ipAddress ? { ipAddress: s.ipAddress } : {}),
      browser: parsed.browser,
      os: parsed.os,
      device: parsed.device,
    };
  });
}

export async function revokeUserSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await AuthSession.updateOne(
    {
      sessionId,
      userId: new mongoose.Types.ObjectId(userId),
      revokedAt: { $exists: false },
    },
    { $set: { revokedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function revokeAllOtherSessions(currentSessionId: string, userId: string): Promise<number> {
  const result = await AuthSession.updateMany(
    {
      userId: new mongoose.Types.ObjectId(userId),
      sessionId: { $ne: currentSessionId },
      revokedAt: { $exists: false },
    },
    { $set: { revokedAt: new Date() } }
  );
  return result.modifiedCount;
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  await AuthSession.updateOne(
    { sessionId, userId: new mongoose.Types.ObjectId(userId), revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}

export async function scheduleUserAccountDeletion(
  userId: string,
  confirmation: string = "confirm"
): Promise<{ message: string; deletionScheduledAt: Date }> {
  if (confirmation.trim().toLowerCase() !== "confirm") {
    throw new Error('Please type "confirm" to confirm account deletion');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const scheduledDate = new Date(Date.now() + ACCOUNT_RECOVERY_WINDOW_MS);
  user.status = "pending_deletion";
  user.deletedAt = new Date();
  user.deletionScheduledAt = scheduledDate;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // Revoke all active sessions so user cannot access their account
  await AuthSession.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );

  return {
    message:
      "Account scheduled for deletion. You will not be able to access your account now. All data will be deleted in 30 days. You can recover your account within 30 days by logging back in.",
    deletionScheduledAt: scheduledDate,
  };
}

export const deleteUserAccount = scheduleUserAccountDeletion;

export async function recoverUserAccount(
  email: string,
  password: string,
  metadata?: SessionMetadata
): Promise<{ user: IUser; tokens: AuthTokens; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await (user as any).comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  if (user.status !== "pending_deletion") {
    const tokens = await issueTokens(user, undefined, metadata);
    return {
      user,
      tokens,
      message: "Account is already active.",
    };
  }

  if (
    user.deletionScheduledAt &&
    user.deletionScheduledAt.getTime() <= Date.now()
  ) {
    await permanentlyDeleteUserAccount(user._id.toString());
    throw new Error(
      "The 30-day recovery period has expired. This account has been permanently deleted."
    );
  }

  // Recover account back to active
  user.status = "active";
  user.deletedAt = null;
  user.deletionScheduledAt = null;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  const tokens = await issueTokens(user, undefined, metadata);
  return {
    user,
    tokens,
    message: "Welcome back! Your account has been recovered successfully.",
  };
}

export async function permanentlyDeleteUserAccount(userId: string): Promise<void> {
  const user = await User.findById(userId).select("+profilePictureKey");
  if (!user) {
    return;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    await cleanupDocumentsForUser(userId);
  } catch (error) {
    console.error(`Failed to cleanup documents for user ${userId}:`, error);
  }

  if (user.profilePictureKey) {
    await deleteDocumentFromS3(user.profilePictureKey).catch((error: unknown) => {
      console.error(`Failed to cleanup profile picture for user ${userId}:`, error);
    });
  }

  await Promise.allSettled([
    Message.deleteMany({ userId }),
    Chat.deleteMany({ userId }),
    AuthSession.deleteMany({ userId: userObjectId }),
    DocumentCollection.deleteMany({ userId: userObjectId }),
    McpServer.deleteMany({ userId: userObjectId }),
    Resume.deleteMany({ userId: userObjectId }),
  ]);

  await User.findByIdAndDelete(userId);
}

export async function purgeExpiredAccounts(): Promise<number> {
  const expiredUsers = await User.find({
    status: "pending_deletion",
    deletionScheduledAt: { $lte: new Date() },
  }).select("_id");

  for (const user of expiredUsers) {
    try {
      await permanentlyDeleteUserAccount(user._id.toString());
    } catch (error) {
      console.error(`Failed to purge expired user ${user._id}:`, error);
    }
  }

  return expiredUsers.length;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  const isMatch = await (user as any).comparePassword(currentPassword);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  // Ensure new password differs from the old one
  const isSame = await (user as any).comparePassword(newPassword);
  if (isSame) {
    throw new Error("New password must be different from the current password");
  }

  // Save the new password; the pre-save hook hashes it when modified
  user.password = newPassword;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // Revoke every active session so previously issued access and refresh tokens
  // cannot be used after the password changes.
  await AuthSession.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}
