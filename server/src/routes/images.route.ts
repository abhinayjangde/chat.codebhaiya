import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Chat } from "../models/chat.model.js";
import { parseBody } from "../lib/validation.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireUsage } from "../middleware/usage.middleware.js";
import { createRateLimiter } from "../lib/rate-limiter.js";
import { env } from "../config/env.js";
import { runImageGenerationGraph } from "../services/image-generation.service.js";

const router: express.Router = express.Router();
const generateImageSchema = z.object({
  chatId: z.string().regex(/^[a-f\d]{24}$/i),
  prompt: z.string().trim().min(1).max(4000),
  provider: z.string().trim().default("google"),
});

router.use(authenticateToken);

// Image renders are costly provider calls; rate limit them aggressively.
const imageGenerationLimiter = createRateLimiter({
  scope: "image-generation",
  max: Math.min(10, env.RATE_LIMIT_CHAT_MAX),
});

router.post(
  "/generate",
  imageGenerationLimiter,
  requireUsage("image_generation"),
  async (req, res, next) => {
  try {
    const { chatId, prompt, provider } = parseBody(generateImageSchema, req.body);
    const userId = req.user!.userId;
    const chat = await Chat.findOne({
      _id: new mongoose.Types.ObjectId(chatId),
      userId: new mongoose.Types.ObjectId(userId),
    }).select("_id");
    if (!chat) {
      res.status(404).json({ success: false, error: "Chat not found" });
      return;
    }

    const result = await runImageGenerationGraph({ chatId, userId, prompt, provider });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
