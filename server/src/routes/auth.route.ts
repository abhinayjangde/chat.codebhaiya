import express, { type NextFunction, type Request, type Response, type Router } from "express";
import {
  registerUser,
  loginUser,
  refreshTokens,
  scheduleUserAccountDeletion,
  recoverUserAccount,
  changePassword,
  revokeSession,
  getUserSessions,
  revokeUserSession,
  revokeAllOtherSessions,
  AccountPendingDeletionError,
} from "../services/auth.service.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../lib/rate-limiter.js";
import { env } from "../config/env.js";
import {
  parseBody,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordChangeSchema,
  preferencesSchema,
  deleteAccountSchema,
  recoverAccountSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../lib/validation.js";
import { User } from "../models/user.model.js";
import { requestPasswordReset, resetPassword } from "../services/password-reset.service.js";

function getClientMetadata(req: Request) {
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
    req.ip ??
    req.socket?.remoteAddress;
  return { userAgent, ipAddress };
}

const router: Router = express.Router();

// Protect credential endpoints from brute-force and credential stuffing.
const authRateLimiter = createRateLimiter({
  scope: "auth",
  max: env.RATE_LIMIT_AUTH_MAX,
});

router.post("/register", authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = parseBody(registerSchema, req.body);

    const { user, tokens } = await registerUser(email, password, name, getClientMetadata(req));

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          preferences: user.preferences,
          status: user.status,
        },
        tokens,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("scheduled for deletion")
    ) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }
    next(error);
  }
});

router.post("/login", authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = parseBody(loginSchema, req.body);

    const { user, tokens } = await loginUser(email, password, getClientMetadata(req));

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          preferences: user.preferences,
          status: user.status,
        },
        tokens,
      },
    });
  } catch (error) {
    if (
      error instanceof AccountPendingDeletionError ||
      (error instanceof Error && (error as any).code === "ACCOUNT_PENDING_DELETION")
    ) {
      const deletionScheduledAt =
        (error as any).deletionScheduledAt instanceof Date
          ? (error as any).deletionScheduledAt.toISOString()
          : (error as any).deletionScheduledAt;

      res.status(403).json({
        success: false,
        code: "ACCOUNT_PENDING_DELETION",
        error:
          "Your account is deactivated and scheduled for permanent deletion. You can recover your account within 30 days.",
        deletionScheduledAt,
      });
      return;
    }

    if (error instanceof Error && error.message === "Invalid credentials") {
      res.status(401).json({
        success: false,
        error: error.message,
      });
      return;
    }

    next(error);
  }
});

router.post("/password/reset-request", authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = parseBody(requestPasswordResetSchema, req.body);
    await requestPasswordReset(email);
    res.status(202).json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/password/reset", authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = parseBody(resetPasswordSchema, req.body);
    await resetPassword(token, password);
    res.status(200).json({
      success: true,
      message: "Your password has been reset. Sign in with your new password.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid or expired reset link") {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

router.post("/recover", authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = parseBody(recoverAccountSchema, req.body);
    const { user, tokens, message } = await recoverUserAccount(email, password, getClientMetadata(req));

    res.status(200).json({
      success: true,
      message,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          preferences: user.preferences,
          status: user.status,
        },
        tokens,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid credentials") {
        res.status(401).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (
        error.message.includes("expired") ||
        error.message.includes("not scheduled")
      ) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
    }

    next(error);
  }
});

router.post("/refresh", authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = parseBody(refreshTokenSchema, req.body);

    const tokens = await refreshTokens(refreshToken, getClientMetadata(req));

    res.status(200).json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid refresh token") {
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    next(error);
  }
});

router.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  await revokeSession(req.user!.sessionId, req.user!.userId);
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

router.get("/sessions", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const currentSessionId = req.user!.sessionId;
    const sessions = await getUserSessions(userId, currentSessionId);

    res.status(200).json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/sessions/revoke-others", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const currentSessionId = req.user!.sessionId;
    const revokedCount = await revokeAllOtherSessions(currentSessionId, userId);

    res.status(200).json({
      success: true,
      message: "All other sessions have been revoked",
      data: { revokedCount },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions/:sessionId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawSessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const targetSessionId = typeof rawSessionId === "string" ? rawSessionId.trim() : "";
    if (!targetSessionId) {
      res.status(400).json({ success: false, error: "Session ID is required" });
      return;
    }

    const userId = req.user!.userId;
    const isCurrent = req.user!.sessionId === targetSessionId;
    await revokeUserSession(targetSessionId, userId);

    res.status(200).json({
      success: true,
      message: isCurrent ? "Current session revoked" : "Session revoked successfully",
      data: { isCurrent, sessionId: targetSessionId },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/account", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { confirmation } = parseBody(deleteAccountSchema, req.body ?? {});
    const userId = req.user!.userId;
    const result = await scheduleUserAccountDeletion(userId, confirmation);
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        deletionScheduledAt: result.deletionScheduledAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('type "confirm"')) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }
    next(error);
  }
});

router.put("/password", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = parseBody(passwordChangeSchema, req.body);
    const userId = req.user!.userId;
    await changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("incorrect") ? 401 : 400;
    if (message.includes("incorrect") || message.includes("Current password") || message.includes("New password")) {
      res.status(status).json({
        success: false,
        error: message,
      });
      return;
    }

    next(error);
  }
});

router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId)
      .select("_id email name preferences status deletionScheduledAt")
      .lean();

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          preferences: user.preferences,
          status: user.status,
          deletionScheduledAt: user.deletionScheduledAt,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.put("/preferences", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { systemInstructions } = parseBody(preferencesSchema, req.body);
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $set: { "preferences.systemInstructions": systemInstructions } },
      { returnDocument: "after", runValidators: true }
    )
      .select("_id email name preferences status")
      .lean();

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          preferences: user.preferences,
          status: user.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
