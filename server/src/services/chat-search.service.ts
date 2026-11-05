import { ObjectId } from "mongodb";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";

export interface SearchResultChat {
  _id: string;
  title: string;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultMessage {
  _id: string;
  chatId: string;
  chatTitle: string;
  role: "user" | "assistant";
  contentSnippet: string;
  isArchived: boolean;
  createdAt: string;
}

export interface SearchChatsResult {
  chats: SearchResultChat[];
  messages: SearchResultMessage[];
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createSnippet(content: string, query: string, maxLength = 120): string {
  if (!content || typeof content !== "string") {
    if (content && typeof content === "object") {
      try {
        content = JSON.stringify(content);
      } catch {
        return "";
      }
    } else {
      return "";
    }
  }

  // Normalize whitespace to single spaces
  const cleanContent = content.replace(/\s+/g, " ").trim();
  if (!cleanContent) return "";

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return cleanContent.length > maxLength ? cleanContent.slice(0, maxLength) + "…" : cleanContent;
  }

  const matchIndex = cleanContent.toLowerCase().indexOf(trimmedQuery.toLowerCase());
  if (matchIndex === -1) {
    return cleanContent.length > maxLength ? cleanContent.slice(0, maxLength) + "…" : cleanContent;
  }

  const queryLen = trimmedQuery.length;
  const remainingSpace = Math.max(0, maxLength - queryLen);
  const half = Math.floor(remainingSpace / 2);

  let start = Math.max(0, matchIndex - half);
  let end = Math.min(cleanContent.length, matchIndex + queryLen + half);

  if (matchIndex - half < 0) {
    end = Math.min(cleanContent.length, end + (half - matchIndex));
  }
  if (matchIndex + queryLen + half > cleanContent.length) {
    const extraEnd = matchIndex + queryLen + half - cleanContent.length;
    start = Math.max(0, start - extraEnd);
  }

  let snippet = cleanContent.slice(start, end).trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < cleanContent.length) snippet = snippet + "…";

  return snippet;
}

export async function searchChatsAndMessages(
  userId: string,
  query: string,
  limit = 30
): Promise<SearchChatsResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { chats: [], messages: [] };
  }

  const userObjectId = new ObjectId(userId);
  const escaped = escapeRegex(trimmed);
  const regex = new RegExp(escaped, "i");

  // 1. Search chats by title (includes archived chats)
  const matchingChats = await Chat.find({
    userId: userObjectId,
    title: { $regex: regex },
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  const formattedChats: SearchResultChat[] = matchingChats.map((c) => ({
    _id: c._id.toString(),
    title: c.title ?? "New Chat",
    isArchived: Boolean(c.isArchived),
    isPinned: Boolean(c.isPinned),
    createdAt: (c.createdAt ? new Date(c.createdAt) : new Date()).toISOString(),
    updatedAt: (c.updatedAt ? new Date(c.updatedAt) : new Date()).toISOString(),
  }));

  // 2. Search messages by content (across all chats owned by the user)
  const matchingMessages = await Message.find({
    userId: userObjectId,
    content: { $regex: regex },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (matchingMessages.length === 0) {
    return { chats: formattedChats, messages: [] };
  }

  // 3. Resolve parent chat details for the matching messages
  const chatIds = Array.from(new Set(matchingMessages.map((m) => m.chatId.toString())));
  const relatedChats = await Chat.find({
    _id: { $in: chatIds.map((id) => new ObjectId(id)) },
    userId: userObjectId,
  }).lean();

  const chatMap = new Map(relatedChats.map((c) => [c._id.toString(), c]));

  const formattedMessages: SearchResultMessage[] = [];
  for (const msg of matchingMessages) {
    const parentChat = chatMap.get(msg.chatId.toString());
    if (!parentChat) continue; // Skip orphan messages

    const contentStr = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content ?? "");
    const snippet = createSnippet(contentStr, trimmed);

    formattedMessages.push({
      _id: msg._id.toString(),
      chatId: parentChat._id.toString(),
      chatTitle: parentChat.title ?? "New Chat",
      role: msg.role === "assistant" ? "assistant" : "user",
      contentSnippet: snippet,
      isArchived: Boolean(parentChat.isArchived),
      createdAt: (msg.createdAt ? new Date(msg.createdAt) : new Date()).toISOString(),
    });
  }

  return {
    chats: formattedChats,
    messages: formattedMessages,
  };
}
