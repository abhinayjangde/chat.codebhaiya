import express, { type NextFunction, type Request, type Response, type Router } from "express";
import {
  registerUser,
  loginUser,
  refreshTokens,
  deleteUserAccount,
  changePassword,
} from "../services/auth.service.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  parseBody,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordChangeSchema,
} from "../lib/validation.js";

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
        },
        tokens,
      },
    });
  } catch (error) {
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
        },
        tokens,
      },
    });
  } catch (error) {
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
  // In a more complex system, you would invalidate the refresh token here
  // For now, we just return success and let the client discard tokens
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

router.delete("/account", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    await deleteUserAccount(userId);
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
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
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
