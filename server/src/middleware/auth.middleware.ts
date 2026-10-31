import type { Request, Response, NextFunction } from "express";
import {
  isSessionActive,
  verifyAccessToken,
  type TokenPayload,
} from "../services/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return Promise.resolve();
  }

  return authenticateTokenAsync(token, req, res, next);
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  return optionalAuthAsync(token, req, next);
}

async function authenticateTokenAsync(
  token: string,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = verifyAccessToken(token);
    if (!(await isSessionActive(payload.sessionId, payload.userId))) {
      res.status(401).json({ error: "Session has expired or been revoked" });
      return;
    }
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

async function optionalAuthAsync(
  token: string | undefined,
  req: Request,
  next: NextFunction
): Promise<void> {
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (await isSessionActive(payload.sessionId, payload.userId)) {
        req.user = payload;
      }
    } catch (error) {
      // Invalid token, but route is optional so continue
    }
  }

  next();
}
