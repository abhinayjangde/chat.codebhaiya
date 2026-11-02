import express, { type Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import * as chatController from "../controllers/chat.controller.js";

const router: Router = express.Router();

// Public endpoint to get available models
router.get("/models", chatController.getModels);

// All endpoints below require authentication
router.use(authenticateToken);

router.get("/", chatController.listChats);
router.post("/", chatController.createChat);

router.get("/:chatId/messages", chatController.getChatMessages);
router.post("/:chatId", chatController.sendMessage);
router.patch("/:chatId", chatController.updateChat);
router.post("/:chatId/duplicate", chatController.duplicateChat);
router.delete("/:chatId", chatController.deleteChat);

router.post("/:chatId/stream", chatController.streamChatMessage);
router.get("/:chatId/pdf", chatController.exportChatPdf);

export default router;
