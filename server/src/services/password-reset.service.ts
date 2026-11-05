import crypto from "node:crypto";
import { env } from "../config/env.js";
import { assertEmailConfigured, sendEmail } from "./email.service.js";
import { User, hashPassword } from "../models/user.model.js";
import { AuthSession } from "../models/auth-session.model.js";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1_000;

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sendResetEmail(email: string, token: string): Promise<void> {
  assertEmailConfigured();
  if (!env.APP_BASE_URL) throw new Error("APP_BASE_URL is required to send password reset emails");

  const resetUrl = new URL("/reset-password", env.APP_BASE_URL);
  resetUrl.searchParams.set("token", token);

  await sendEmail({
    to: email,
    subject: "Reset your Codebhaiya password",
    text: `We received a request to reset your Codebhaiya password. Use this link within 30 minutes:\n\n${resetUrl.toString()}\n\nIf you did not request this, you can ignore this email. Your password will not change.`,
    html: `<p>We received a request to reset your Codebhaiya password.</p><p><a href="${resetUrl.toString()}">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email. Your password will not change.</p>`,
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  // Check configuration before looking up the account so responses do not reveal
  // whether an address exists when email delivery is unavailable.
  assertEmailConfigured();
  if (!env.APP_BASE_URL) throw new Error("APP_BASE_URL is required to send password reset emails");

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    status: "active",
  }).select("_id email");

  if (!user) return;

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  const updateResult = await User.updateOne(
    { _id: user._id, status: "active" },
    {
      $set: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    }
  );
  if (updateResult.matchedCount === 0) return;

  try {
    await sendResetEmail(user.email, token);
  } catch (error) {
    await User.updateOne(
      { _id: user._id, passwordResetTokenHash: tokenHash },
      { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } }
    );
    console.error("Password reset email delivery failed", {
      message: error instanceof Error ? error.message : "Unknown email provider error",
    });
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashResetToken(token);
  const password = await hashPassword(newPassword);

  // Match and consume the token in one atomic update so a link can only be used once.
  const user = await User.findOneAndUpdate(
    {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      status: "active",
    },
    {
      $set: { password },
      $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
    },
    { returnDocument: "after" }
  ).select("_id");

  if (!user) {
    throw new Error("Invalid or expired reset link");
  }

  await AuthSession.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}
