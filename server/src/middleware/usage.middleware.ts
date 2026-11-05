import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/validation.js";
import {
  enforceUsageQuota,
  recordUsage,
  type UsageAction,
} from "../services/usage.service.js";

interface UsageRequest extends Omit<Request, "file"> {
  file?: { size: number };
}

/**
 * Reserves usage units immediately before the billable work is done (provider
 * calls are made regardless of how a request turns out, so counting at the
 * gate prevents parallel bursts from overshooting the monthly quota).
 *
 * - "message": a chat generation turn.
 * - "upload": counts one file against both the upload count and byte quota.
 * - "image_generation": an image render (also counts as an expensive model call).
 * - "expensive_model": document summary / Q&A generation.
 */
export function requireUsage(
  action: UsageAction
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    try {
      await enforceUsageQuota(userId, action);

      if (action === "message") {
        await recordUsage(userId, { messageCount: 1 });
      } else if (action === "upload") {
        const bytes = (req as UsageRequest).file?.size ?? 0;
        await recordUsage(userId, { uploadCount: 1, uploadBytes: bytes });
      } else if (action === "image_generation") {
        await recordUsage(userId, {
          imageGenerationCount: 1,
          expensiveModelCallCount: 1,
        });
      } else {
        await recordUsage(userId, { expensiveModelCallCount: 1 });
      }
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      next(error);
      return;
    }

    next();
  };
}
