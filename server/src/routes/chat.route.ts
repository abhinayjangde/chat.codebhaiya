import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireUsage } from "../middleware/usage.middleware.js";
import { createRateLimiter } from "../lib/rate-limiter.js";
import { env } from "../config/env.js";
import * as chatController from "../controllers/chat.controller.js";
import resumeRoutes from "./resume.route.js";

const router: Router = express.Router();

// Chat generation and message reads are metered differently.
const chatGenerationLimiter = createRateLimiter({
  scope: "chat-generation",
  max: env.RATE_LIMIT_CHAT_MAX,
});
const chatReadLimiter = createRateLimiter({
  scope: "chat-read",
  max: env.RATE_LIMIT_READ_MAX,
});

// Public endpoint to get available models
router.get("/models", chatController.getModels);

// All endpoints below require authentication
router.use(authenticateToken);

router.get("/", chatReadLimiter, chatController.listChats);
router.get("/search", chatReadLimiter, chatController.searchChats);
router.post("/", chatGenerationLimiter, requireUsage("message"), chatController.createChat);
router.delete("/", chatController.deleteAllChats);
router.get("/export", chatController.exportAllChats);

router.get(
  "/:chatId/messages",
  chatReadLimiter,
  chatController.getChatMessages
);
router.post("/:chatId", chatGenerationLimiter, requireUsage("message"), chatController.sendMessage);
router.patch("/:chatId", chatController.updateChat);
router.post("/:chatId/duplicate", chatReadLimiter, chatController.duplicateChat);
router.delete("/:chatId", chatController.deleteChat);

router.post(
  "/:chatId/stream",
  chatGenerationLimiter,
  requireUsage("message"),
  chatController.streamChatMessage
);
router.get("/:chatId/pdf", chatReadLimiter, chatController.exportChatPdf);
router.use("/:chatId/resume", resumeRoutes);

export default router;
