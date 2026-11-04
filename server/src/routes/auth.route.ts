import express, { type NextFunction, type Request, type Response, type Router } from "express";
import {
  registerUser,
  loginUser,
  refreshTokens,
  scheduleUserAccountDeletion,
  recoverUserAccount,
  changePassword,
  revokeSession,
  AccountPendingDeletionError,
} from "../services/auth.service.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  parseBody,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordChangeSchema,
  preferencesSchema,
  deleteAccountSchema,
  recoverAccountSchema,
} from "../lib/validation.js";
import { User } from "../models/user.model.js";

const router: Router = express.Router();

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = parseBody(registerSchema, req.body);

    const { user, tokens } = await registerUser(email, password, name);

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

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = parseBody(loginSchema, req.body);

    const { user, tokens } = await loginUser(email, password);

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

router.post("/recover", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = parseBody(recoverAccountSchema, req.body);
    const { user, tokens, message } = await recoverUserAccount(email, password);

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

router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = parseBody(refreshTokenSchema, req.body);

    const tokens = await refreshTokens(refreshToken);

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
