import express, { type Request, type Response, type Router } from "express";
import {
  registerUser,
  loginUser,
  refreshTokens,
} from "../services/auth.service.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router: Router = express.Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({
        error: "Email, password, and name are required",
      });
      return;
    }

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
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: "Email and password are required",
      });
      return;
    }

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
    res.status(401).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: "Refresh token is required",
      });
      return;
    }

    const tokens = await refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      error: (error as Error).message,
    });
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

router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    // req.user is set by authenticateToken middleware
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
