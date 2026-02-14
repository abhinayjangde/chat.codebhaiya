import { ObjectId } from "mongodb";
import { Message } from "../models/message.model.js";

export interface PaginationParams {
  limit: number;
  before?: string;
  after?: string;
}

export interface PaginatedMessages {
  messages: any[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export async function getPaginatedMessages(
  chatId: string,
  userId: string,
  params: PaginationParams
): Promise<PaginatedMessages> {
  const { limit = 20, before, after } = params;
  const maxLimit = Math.min(limit, 50);

  // Build query
  const query: any = { 
    chatId: new ObjectId(chatId),
    userId: new ObjectId(userId)
  };

  // Cursor-based pagination
  if (before) {
    query._id = { $lt: new ObjectId(before) };
  } else if (after) {
    query._id = { $gt: new ObjectId(after) };
  }

  // Get total count (for first page only)
  let total = 0;
  if (!before && !after) {
    total = await Message.countDocuments({
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId)
    });
  }

  // Fetch messages
  const messages = await Message
    .find(query)
    .sort({ createdAt: -1 })  // Newest first
    .limit(maxLimit + 1);     // +1 to check hasMore

  const hasMore = messages.length > maxLimit;
  
  // Remove the extra item used for checking hasMore
  if (hasMore) {
    messages.pop();
  }

  // Reverse to get oldest first (better for display)
  const orderedMessages = messages.reverse();

  // Determine next cursor
  const firstMessage = orderedMessages[0];
  const nextCursor = hasMore && firstMessage && firstMessage._id
    ? firstMessage._id.toString()
    : null;

  return {
    messages: orderedMessages,
    nextCursor,
    hasMore,
    total
  };
}

export async function getMessageById(
  messageId: string,
  chatId: string,
  userId: string
) {
  return Message.findOne({
    _id: new ObjectId(messageId),
    chatId: new ObjectId(chatId),
    userId: new ObjectId(userId)
  });
}

export async function deleteMessage(
  messageId: string,
  chatId: string,
  userId: string
) {
  return Message.findOneAndDelete({
    _id: new ObjectId(messageId),
    chatId: new ObjectId(chatId),
    userId: new ObjectId(userId)
  });
}
