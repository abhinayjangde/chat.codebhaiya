import type { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { Document } from "../models/document.model.js";
import { User } from "../models/user.model.js";
import { autoSelectModel, getAgent, getAvailableModels, getDefaultModel } from "../lib/model.js";
import {
  chatIdParamSchema,
  chatMessageSchema,
  createChatSchema,
  listChatsQuerySchema,
  paginationQuerySchema,
  parseBody,
  renameChatSchema,
  searchChatsQuerySchema,
  updateChatSchema,
} from "../lib/validation.js";
import { generateChatTitle } from "../services/chat.service.js";
import { cleanupDocumentsForChat } from "../services/document-cleanup.service.js";
import { searchChatsAndMessages } from "../services/chat-search.service.js";
import { getPaginatedMessages } from "../services/message.service.js";
import { recordUsage } from "../services/usage.service.js";
import { downloadDocumentFromS3 } from "../services/storage.service.js";
import { exportChatAsPdf, exportAllChatsAsJson } from "../services/chat-export.service.js";
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
      default: getDefaultModel(),
    },
  });
}

export async function listChats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { archived } = parseBody(listChatsQuerySchema, req.query);
    const isArchived = archived === true;

    const filter: Record<string, any> = {
      userId: new ObjectId(userId),
      isArchived: isArchived ? true : { $ne: true },
    };

    const chats = await Chat.find(filter).sort({ isPinned: -1, updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: { chats },
    });
  } catch (error) {
    next(error);
  }
}

export async function searchChats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { q, limit } = parseBody(searchChatsQuerySchema, req.query);
    const result = await searchChatsAndMessages(userId, q, limit);

    res.status(200).json({
      success: true,
      data: result,
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
    const around = query.around;

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
      around,
    });

    const generatedImageIds = result.messages.flatMap((message) =>
      (message.attachments ?? [])
        .filter((attachment: { type?: string; documentId?: string; content?: string }) =>
          attachment.type === "image" && attachment.documentId && !attachment.content
        )
        .map((attachment: { documentId: string }) => attachment.documentId)
    );
    if (generatedImageIds.length > 0) {
      const generatedDocuments = await Document.find({
        _id: { $in: generatedImageIds.map((id: string) => new ObjectId(id)) },
        userId: new ObjectId(userId),
        filename: /^generated-image-/,
        status: "ready",
      }).select("_id mimeType s3Key").lean();
      const images = await Promise.all(generatedDocuments.map(async (document) => ({
        id: document._id.toString(),
        content: `data:${document.mimeType};base64,${(await downloadDocumentFromS3(document.s3Key)).toString("base64")}`,
      })));
      const imageContentById = new Map(images.map((image) => [image.id, image.content]));
      for (const message of result.messages) {
        message.attachments = (message.attachments ?? []).map((attachment: any) => ({
          ...(attachment.toObject?.() ?? attachment),
          ...(attachment.documentId && imageContentById.has(attachment.documentId)
            ? { content: imageContentById.get(attachment.documentId) }
            : {}),
        }));
      }
    }

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
      mcpServerIds ?? [],
      { chatId, userId }
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

    // Tokens are tracked in addition to the message unit reserved at the gate.
    const lastMessage = response.messages[response.messages.length - 1] as any;
    if (
      lastMessage?.usage_metadata &&
      typeof lastMessage.usage_metadata.input_tokens === "number" &&
      typeof lastMessage.usage_metadata.output_tokens === "number"
    ) {
      void recordUsage(userId, {
        inputTokens: lastMessage.usage_metadata.input_tokens,
        outputTokens: lastMessage.usage_metadata.output_tokens,
      }).catch((error) => {
        console.error("Failed to record token usage:", error);
      });
    }

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

export async function updateChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawChatId = Array.isArray(req.params.chatId) ? req.params.chatId[0] : req.params.chatId;
    const chatId = parseBody(chatIdParamSchema, rawChatId);
    const { title, isPinned, isArchived } = parseBody(updateChatSchema, req.body);
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

    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (title !== undefined) updates.title = title.trim();
    if (isPinned !== undefined) updates.isPinned = isPinned;
    if (isArchived !== undefined) updates.isArchived = isArchived;

    const updatedChat = await Chat.findByIdAndUpdate(chatId, updates, { new: true });

    res.status(200).json({
      success: true,
      message: "Chat updated successfully",
      data: {
        title: updatedChat?.title,
        chat: updatedChat,
        ...updatedChat?.toObject(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export const renameChat = updateChat;

export async function duplicateChat(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const newChat = await Chat.create({
      userId: new ObjectId(userId),
      title: `${chat.title} (Copy)`,
      isPinned: false,
      isArchived: false,
    });

    const messages = await Message.find({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
    }).sort({ createdAt: 1, _id: 1 });

    if (messages.length > 0) {
      const clonedMessages = messages.map((msg) => {
        const obj = msg.toObject();
        delete (obj as any)._id;
        return {
          ...obj,
          chatId: newChat._id,
          userId: new ObjectId(userId),
        };
      });
      await Message.insertMany(clonedMessages);
    }

    res.status(201).json({
      success: true,
      message: "Chat duplicated successfully",
      data: {
        chat: newChat,
        chatId: newChat._id,
        title: newChat.title,
      },
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

export async function exportAllChats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const exportData = await exportAllChatsAsJson(userId);
    const filename = `chat-history-export-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    next(error);
  }
}

export async function deleteAllChats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const userObjectId = new ObjectId(userId);
    const userChats = await Chat.find({ userId: userObjectId }).select("_id").lean();

    for (const chat of userChats) {
      try {
        await cleanupDocumentsForChat(userId, chat._id.toString());
      } catch (err) {
        console.error(`Failed to cleanup documents for chat ${chat._id}:`, err);
      }
    }

    const [deletedMessages, deletedChats] = await Promise.all([
      Message.deleteMany({ userId: userObjectId }),
      Chat.deleteMany({ userId: userObjectId }),
    ]);

    res.status(200).json({
      success: true,
      message: "Chat history deleted successfully",
      data: {
        deletedChatsCount: deletedChats.deletedCount,
        deletedMessagesCount: deletedMessages.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
}
