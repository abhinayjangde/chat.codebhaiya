import type { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { autoSelectModel, DEFAULT_MODEL, getAgent, getAvailableModels } from "../lib/model.js";
import {
  chatIdParamSchema,
  chatMessageSchema,
  createChatSchema,
  paginationQuerySchema,
  parseBody,
  renameChatSchema,
} from "../lib/validation.js";
import { generateChatTitle } from "../services/chat.service.js";
import { cleanupDocumentsForChat } from "../services/document-cleanup.service.js";
import { getPaginatedMessages } from "../services/message.service.js";
import { exportChatAsPdf } from "../services/chat-export.service.js";
import {
  buildMessageContent,
  executeChatStream,
  getPersistedAttachments,
} from "../services/chat-stream.service.js";

export async function getModels(_req: Request, res: Response): Promise<void> {
  const models = getAvailableModels();
  res.status(200).json({
    success: true,
    data: {
      models,
      default: DEFAULT_MODEL,
    },
  });
}

export async function listChats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const chats = await Chat.find({ userId: new ObjectId(userId) }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: { chats },
    });
  } catch (error) {
    next(error);
  }
}

export async function getChatMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const userId = req.user?.userId;

    if (typeof userId !== "string") {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const query = parseBody(paginationQuerySchema, req.query);
    const limit = query.limit ?? 20;
    const before = query.before;
    const after = query.after;

    const chat = await Chat.findOne({
      _id: new ObjectId(chatId),
      userId: new ObjectId(userId),
    });

    if (!chat) {
      res.status(404).json({
        success: false,
        error: "Chat not found",
      });
      return;
    }

    const result = await getPaginatedMessages(chatId, userId, {
      limit,
      before,
      after,
    });

    res.status(200).json({
      success: true,
      data: {
        messages: result.messages,
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          total: result.total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message } = parseBody(createChatSchema, req.body);
    const userId = req.user?.userId;

    const title = await generateChatTitle(message || "Attachment analysis");

    const chat = await Chat.create({
      title,
      userId: new ObjectId(userId),
    });

    res.status(201).json({
      success: true,
      data: {
        title: chat.title,
        chatId: chat._id,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const {
      message,
      attachments,
      language,
      model,
      collectionId,
      mcpServerIds,
    } = parseBody(chatMessageSchema, req.body);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const chat = await Chat.findOne({
      _id: new ObjectId(chatId),
      userId: new ObjectId(userId),
    });

    if (!chat) {
      res.status(404).json({
        success: false,
        error: "Chat not found",
      });
      return;
    }

    let selectedModel = model ?? undefined;

    const previousMessages = await Message.find({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
    }).sort({ createdAt: 1, _id: 1 });

    const formatted: Array<{ role: string; content: any }> = previousMessages
      .filter((msg) => msg.role && msg.content)
      .map((msg) => ({
        role: msg.role as string,
        content: msg.content as string,
      }));

    const { content: finalContent, documentSources } = await buildMessageContent(
      message,
      attachments,
      userId,
      collectionId
    );

    formatted.push({ role: "user", content: finalContent });

    if (selectedModel === "auto" || !selectedModel) {
      selectedModel = await autoSelectModel(message, attachments ?? []);
    }

    const user = await User.findById(userId).select("preferences.systemInstructions").lean();
    const agent = await getAgent(
      selectedModel,
      language ?? undefined,
      user?.preferences?.systemInstructions,
      mcpServerIds ?? []
    );
    const response = await agent.invoke({ messages: formatted });
    await Message.create({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
      role: "user",
      content: message,
      attachments: getPersistedAttachments(attachments),
    });

    const assistantContent = response.messages[response.messages.length - 1]?.content;
    const contentString = typeof assistantContent === "string" ? assistantContent : JSON.stringify(assistantContent || "");

    await Message.create({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
      role: "assistant",
      content: contentString,
      modelName: selectedModel,
      ...(documentSources.length > 0 ? { sources: documentSources } : {}),
    });

    await Chat.findByIdAndUpdate(chatId, {
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        reply: assistantContent,
        ...(documentSources.length > 0 ? { sources: documentSources } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function renameChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const { title } = parseBody(renameChatSchema, req.body);
    const userId = req.user?.userId;

    const chat = await Chat.findOne({
      _id: new ObjectId(chatId),
      userId: new ObjectId(userId),
    });

    if (!chat) {
      res.status(404).json({
        success: false,
        error: "Chat not found",
      });
      return;
    }

    await Chat.findByIdAndUpdate(chatId, {
      title: title.trim(),
      updatedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Chat renamed successfully",
      data: { title: title.trim() },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const chat = await Chat.findOne({
      _id: new ObjectId(chatId),
      userId: new ObjectId(userId),
    });

    if (!chat) {
      res.status(404).json({
        success: false,
        error: "Chat not found",
      });
      return;
    }

    await cleanupDocumentsForChat(userId, chatId);
    await Message.deleteMany({ chatId: new ObjectId(chatId) });
    await Chat.findByIdAndDelete(chatId);

    res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function streamChatMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const {
      message,
      attachments,
      language,
      model,
      collectionId,
      editMessageId,
      regenerateMessageId,
      mcpServerIds,
    } = parseBody(chatMessageSchema, req.body);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    await executeChatStream({
      chatId,
      userId,
      message,
      attachments,
      language,
      model,
      collectionId,
      editMessageId,
      regenerateMessageId,
      mcpServerIds,
      res,
    });
  } catch (error) {
    console.error("Streaming error:", error);
    if (!res.headersSent) {
      next(error);
      return;
    }
    res.write(`data: ${JSON.stringify({
      type: "error",
      error: (error as Error).message,
    })}\n\n`);
    res.end();
  }
}

export async function exportChatPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    await exportChatAsPdf(chatId, userId, res);
  } catch (error) {
    console.error("PDF Generation error:", error);
    if (!res.headersSent) {
      next(error);
    }
  }
}
