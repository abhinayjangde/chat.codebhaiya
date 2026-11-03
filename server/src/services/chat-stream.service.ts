import type { Response } from "express";
import { ObjectId } from "mongodb";
import { Chat } from "../models/chat.model.js";
import { Document } from "../models/document.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { autoSelectModel, getAgent } from "../lib/model.js";
import { HttpError } from "../lib/validation.js";
import { downloadDocumentFromS3 } from "./storage.service.js";
import { listReadyDocumentIdsForCollection, retrieveRelevantChunks, type RetrievedChunk } from "./retrieval.service.js";
import type { SearchResult } from "./search.service.js";

export interface ChatAttachment {
  type: "image" | "audio" | "document";
  content?: string | undefined;
  documentId?: string | undefined;
  mimeType: string;
  name: string;
  size: number;
}

export interface DocumentSource {
  type: "document";
  title: string;
  snippet: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  pageNumber?: number;
  score: number;
}

const MAX_DOCUMENT_CONTEXT_CHARS = 16_000;

export function getPersistedAttachments(
  attachments: ChatAttachment[] | undefined
): Omit<ChatAttachment, "content">[] {
  return (attachments ?? []).map(({ content: _content, ...attachment }) => attachment);
}

export function toDocumentSource(chunk: RetrievedChunk): DocumentSource {
  return {
    type: "document",
    title: chunk.filename,
    snippet: chunk.text,
    documentId: chunk.documentId,
    filename: chunk.filename,
    chunkIndex: chunk.chunkIndex,
    ...(chunk.pageNumber !== undefined ? { pageNumber: chunk.pageNumber } : {}),
    score: chunk.score,
  };
}

export async function buildMessageContent(
  message: string,
  attachments: ChatAttachment[] | undefined,
  userId: string,
  collectionId?: string
): Promise<{ content: any; documentSources: DocumentSource[] }> {
  const currentAttachments = attachments ?? [];
  const attachmentPrompt = currentAttachments.length > 0
    ? "Please analyze the attached file(s) and explain what you find."
    : "";
  const effectiveMessage = message || attachmentPrompt;
  const documentAttachments = currentAttachments.filter(
    (attachment) => attachment.type === "document"
  );
  const attachedDocumentIds = [
    ...new Set(currentAttachments.map((attachment) => attachment.documentId).filter(Boolean)),
  ] as string[];
  const collectionDocumentIds = collectionId
    ? await listReadyDocumentIdsForCollection(collectionId, userId)
    : [];
  const documentIds = [...new Set([...attachedDocumentIds, ...collectionDocumentIds])];

  if (documentAttachments.some((attachment) => !attachment.documentId)) {
    throw new HttpError(400, "Document attachment ID is required");
  }

  const ownedDocuments = documentIds.length > 0
    ? await Document.find({
        _id: { $in: documentIds },
        userId: new ObjectId(userId),
      })
        .select("_id status mimeType s3Key")
        .lean()
    : [];

  if (documentIds.length > 0) {
    if (ownedDocuments.length !== documentIds.length) {
      throw new HttpError(404, "Document not found");
    }

    const processingDocument = ownedDocuments.find(
      (document) => document.status !== "ready"
    );
    if (processingDocument) {
      throw new HttpError(409, "Document is still being processed");
    }
  }

  const documentSources = documentIds.length > 0
    ? (await retrieveRelevantChunks({
        query: effectiveMessage,
        userId,
        documentIds,
        limit: 6,
      })).map(toDocumentSource)
    : [];

  let documentContext = documentSources
    .map((source) => {
      const page = source.pageNumber ? `, page ${source.pageNumber}` : "";
      return `--- ${source.filename}${page}, chunk ${source.chunkIndex} ---\n${source.snippet}`;
    })
    .join("\n\n");

  if (documentContext.length > MAX_DOCUMENT_CONTEXT_CHARS) {
    documentContext = `${documentContext.slice(0, MAX_DOCUMENT_CONTEXT_CHARS)}\n[Document context truncated]`;
  }

  const hasMedia = currentAttachments.some(
    (attachment) => attachment.type === "image" || attachment.type === "audio"
  );

  if (!hasMedia && !documentContext) {
    return { content: effectiveMessage, documentSources };
  }

  const ownedMediaDocuments = new Map(
    ownedDocuments.map((document) => [document._id.toString(), document])
  );

  const content: Array<Record<string, unknown>> = [];
  for (const attachment of currentAttachments) {
    const document = attachment.documentId
      ? ownedMediaDocuments.get(attachment.documentId)
      : undefined;
    const mediaContent = attachment.content ?? (
      document
        ? `data:${document.mimeType};base64,${(await downloadDocumentFromS3(document.s3Key)).toString("base64")}`
        : undefined
    );

    if (attachment.type === "image" && mediaContent) {
      const imageDataUrl = mediaContent.startsWith("data:")
        ? mediaContent
        : `data:${attachment.mimeType};base64,${mediaContent}`;

      if (!/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(imageDataUrl)) {
        throw new HttpError(400, "Uploaded image could not be encoded for analysis");
      }

      content.push({
        type: "image_url",
        image_url: imageDataUrl,
      });
    } else if (attachment.type === "audio" && mediaContent) {
      content.push({
        type: "media",
        mimeType: attachment.mimeType,
        data: mediaContent.split(",")[1] ?? mediaContent,
      });
    }
  }

  const textPrompt = documentContext
    ? `${effectiveMessage}\n\nUse the following retrieved document context when answering:\n${documentContext}`
    : effectiveMessage;
  content.push({ type: "text", text: textPrompt });

  return { content, documentSources };
}

export function getMessageContent(content: any): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((c) => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object" && "text" in c) return c.text;
      return JSON.stringify(c);
    }).join("");
  }
  return JSON.stringify(content);
}

export function parseSearchResults(content: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lines = content.split("\n");
  let currentResult: Partial<SearchResult> & { title: string } = { title: "" };

  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s+(.+)$/);
    if (match) {
      if (currentResult.position) {
        results.push(currentResult as SearchResult);
      }
      currentResult = {
        position: parseInt(match[1] || "0", 10),
        title: match[2] || "",
      };
    } else if (line.startsWith("URL:")) {
      currentResult.link = line.replace("URL:", "").trim();
    } else if (currentResult.position && line.trim()) {
      currentResult.snippet = line.trim();
    }
  }

  if (currentResult.position) {
    results.push(currentResult as SearchResult);
  }

  return results;
}

export interface StreamChatParams {
  chatId: string;
  userId: string;
  message: string;
  attachments?: ChatAttachment[] | undefined;
  language?: string | undefined;
  model?: string | null | undefined;
  collectionId?: string | undefined;
  editMessageId?: string | null | undefined;
  regenerateMessageId?: string | null | undefined;
  mcpServerIds?: string[] | null | undefined;
  res: Response;
}

export async function executeChatStream(params: StreamChatParams): Promise<void> {
  const {
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
  } = params;

  const chat = await Chat.findOne({
    _id: new ObjectId(chatId),
    userId: new ObjectId(userId),
  });

  if (!chat) {
    res.write(`data: ${JSON.stringify({ type: "error", error: "Chat not found" })}\n\n`);
    res.end();
    return;
  }

  const cleanEditMessageId = editMessageId?.trim() || undefined;
  const cleanRegenerateMessageId = regenerateMessageId?.trim() || undefined;
  const isRegenerate = Boolean(cleanRegenerateMessageId);
  const replacementMessageId = cleanEditMessageId ?? cleanRegenerateMessageId;

  const isObjectId = (val?: string | null): val is string => Boolean(val && /^[a-f\d]{24}$/i.test(val));

  let replacementMessage: any = null;
  if (isObjectId(replacementMessageId)) {
    replacementMessage = await Message.findOne({
      _id: new ObjectId(replacementMessageId),
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
    });
  }

  // Graceful fallback if target message wasn't found by explicit ObjectId (e.g. client local ID or outdated ID)
  if (!replacementMessage) {
    if (cleanRegenerateMessageId) {
      replacementMessage = await Message.findOne({
        chatId: new ObjectId(chatId),
        userId: new ObjectId(userId),
        role: "assistant",
      }).sort({ createdAt: -1, _id: -1 });
    } else if (cleanEditMessageId) {
      replacementMessage = await Message.findOne({
        chatId: new ObjectId(chatId),
        userId: new ObjectId(userId),
        role: "user",
      }).sort({ createdAt: -1, _id: -1 });
    }
  }

  const { content: finalContent, documentSources } = await buildMessageContent(
    message,
    attachments,
    userId,
    collectionId
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let previousMessages = await Message.find({
    chatId: new ObjectId(chatId),
    userId: new ObjectId(userId),
  }).sort({ createdAt: 1, _id: 1 });
  let messagesToReplace: typeof previousMessages = [];

  if (replacementMessage) {
    const replacementIndex = previousMessages.findIndex(
      (entry) => entry._id.toString() === replacementMessage._id.toString()
    );
    if (replacementIndex !== -1) {
      messagesToReplace = previousMessages.slice(replacementIndex);
      previousMessages = previousMessages.slice(0, replacementIndex);
    }
  }

  // When regenerating, if previousMessages ends with a user message (the prompt),
  // slice it off before pushing finalContent so the user prompt is not duplicated in LLM context.
  const lastPreviousMessage = previousMessages[previousMessages.length - 1];
  if (isRegenerate && lastPreviousMessage?.role === "user") {
    previousMessages = previousMessages.slice(0, -1);
  }

  const formatted: Array<{ role: string; content: any }> = previousMessages
    .filter((msg) => msg.role && msg.content)
    .map((msg) => ({
      role: msg.role as string,
      content: msg.content as string,
    }));

  formatted.push({ role: "user", content: finalContent });

  let fullResponse = "";
  const usedTools: any[] = [];
  const sources: Array<SearchResult | DocumentSource> = [...documentSources];

  let selectedModel = model ?? undefined;
  if (selectedModel === "auto" || !selectedModel) {
    selectedModel = await autoSelectModel(message, attachments ?? []);
  }

  const user = await User.findById(userId).select("preferences.systemInstructions").lean();
  let lastUpdatedResume: any = null;

  const agent = await getAgent(
    selectedModel,
    language ?? undefined,
    user?.preferences?.systemInstructions,
    mcpServerIds ?? [],
    {
      chatId,
      userId,
      onResumeUpdated: (updatedResume) => {
        lastUpdatedResume = updatedResume;
        try {
          res.write(`data: ${JSON.stringify({
            type: "resume_update",
            resume: updatedResume,
          })}\n\n`);
        } catch (streamErr) {
          console.error("Error writing resume_update event to stream:", streamErr);
        }
      },
    }
  );
  const stream = await agent.stream(
    { messages: formatted },
    { streamMode: "messages" }
  );

  for await (const chunk of stream) {
    const [messageChunk, _metadata] = chunk as [any, any];

    if (!messageChunk) continue;

    const msgType = messageChunk._getType?.() ?? messageChunk.constructor?.name ?? "";

    if (msgType === "ai" || msgType === "AIMessageChunk") {
      const toolCallChunks = messageChunk.tool_call_chunks;
      if (toolCallChunks && Array.isArray(toolCallChunks) && toolCallChunks.length > 0) {
        for (const toolChunk of toolCallChunks) {
          if (toolChunk.name === "web_search" || toolChunk.name === "save_or_update_resume") {
            usedTools.push({
              name: toolChunk.name,
              input: toolChunk.args,
            });

            res.write(`data: ${JSON.stringify({
              type: "tool_start",
              tool: toolChunk.name,
            })}\n\n`);
          }
        }
      }

      const content = getMessageContent(messageChunk.content);
      if (content) {
        fullResponse += content;

        res.write(`data: ${JSON.stringify({
          type: "token",
          content,
        })}\n\n`);
      }
    }

    if (msgType === "tool" || msgType === "ToolMessageChunk" || msgType === "ToolMessage") {
      const toolName = messageChunk.name || "unknown";
      const content = getMessageContent(messageChunk.content);

      if (toolName === "web_search") {
        try {
          const searchResults = parseSearchResults(content);
          if (searchResults.length > 0) {
            sources.push(...searchResults);

            res.write(`data: ${JSON.stringify({
              type: "sources",
              sources: searchResults,
            })}\n\n`);
          }
        } catch {
          // Not search results, ignore
        }
      }

      usedTools.push({
        name: toolName,
        output: content,
      });

      res.write(`data: ${JSON.stringify({
        type: "tool_result",
        tool: toolName,
        output: content,
      })}\n\n`);
    }
  }

  const messageData: any = {
    chatId: new ObjectId(chatId),
    userId: new ObjectId(userId),
    role: "assistant",
    content: fullResponse,
    modelName: selectedModel,
  };

  if (sources.length > 0) {
    messageData.sources = sources;
  }
  if (usedTools.length > 0) {
    messageData.usedTools = usedTools;
  }

  if (replacementMessage && messagesToReplace.length > 0) {
    await Message.deleteMany({
      _id: { $in: messagesToReplace.map((entry) => entry._id) },
    });
  }

  let userMessage: any = null;
  if (!isRegenerate) {
    userMessage = await Message.create({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
      role: "user",
      content: message,
      attachments: getPersistedAttachments(attachments),
    });
  } else {
    // When regenerating, check if the prompt user message already exists in DB
    const existingUser = await Message.findOne({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
      role: "user",
    }).sort({ createdAt: -1, _id: -1 });

    if (!existingUser) {
      userMessage = await Message.create({
        chatId: new ObjectId(chatId),
        userId: new ObjectId(userId),
        role: "user",
        content: message,
        attachments: getPersistedAttachments(attachments),
      });
    } else {
      userMessage = existingUser;
    }
  }

  const assistantMessage = await Message.create(messageData);

  await Chat.findByIdAndUpdate(chatId, {
    updatedAt: new Date(),
  });

  const doneEvent: any = {
    type: "done",
    messageId: assistantMessage._id.toString(),
  };
  if (userMessage?._id) {
    doneEvent.userMessageId = userMessage._id.toString();
  }
  if (sources.length > 0) {
    doneEvent.sources = sources;
  }
  if (usedTools.length > 0) {
    doneEvent.usedTools = usedTools;
  }
  if (lastUpdatedResume) {
    doneEvent.resume = lastUpdatedResume;
  }

  res.write(`data: ${JSON.stringify(doneEvent)}\n\n`);
  res.end();
}
