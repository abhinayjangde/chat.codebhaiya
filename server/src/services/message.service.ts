import { ObjectId } from "mongodb";
import { Message } from "../models/message.model.js";

export interface PaginationParams {
  limit: number;
  before?: string | undefined;
  after?: string | undefined;
  around?: string | undefined;
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
  const { limit = 20, before, after, around } = params;
  const maxLimit = Math.min(limit, 50);

  // If around is provided, retrieve a window centered on the target message
  if (around) {
    try {
      const targetMessage = await Message.findOne({
        _id: new ObjectId(around),
        chatId: new ObjectId(chatId),
        userId: new ObjectId(userId),
      });

      if (targetMessage) {
        const half = Math.max(1, Math.floor(maxLimit / 2));
        const [olderMessages, newerMessages, total] = await Promise.all([
          Message.find({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            _id: { $lt: targetMessage._id },
          })
            .sort({ _id: -1 })
            .limit(half),
          Message.find({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
            _id: { $gt: targetMessage._id },
          })
            .sort({ _id: 1 })
            .limit(half),
          Message.countDocuments({
            chatId: new ObjectId(chatId),
            userId: new ObjectId(userId),
          }),
        ]);

        const orderedMessages = [...olderMessages.reverse(), targetMessage, ...newerMessages];
        const firstMessage = orderedMessages[0];
        const nextCursor =
          total > orderedMessages.length && firstMessage && firstMessage._id
            ? firstMessage._id.toString()
            : null;

        return {
          messages: orderedMessages,
          nextCursor,
          hasMore: total > orderedMessages.length,
          total,
        };
      }
    } catch {
      // If around was invalid, fall through to default cursor query
    }
  }

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
    // Use the same key as the cursor filter so records cannot move between pages.
    .sort({ _id: -1 })  // Newest first
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

export async function setMessageFeedback(
  messageId: string,
  chatId: string,
  userId: string,
  feedbackData: {
    rating?: "like" | "dislike" | null | undefined;
    reason?: string | null | undefined;
    comment?: string | null | undefined;
  }
) {
  if (!feedbackData.rating) {
    return Message.findOneAndUpdate(
      {
        _id: new ObjectId(messageId),
        chatId: new ObjectId(chatId),
        userId: new ObjectId(userId),
      },
      { $unset: { feedback: 1 } },
      { returnDocument: "after" }
    );
  }

  const now = new Date();
  return Message.findOneAndUpdate(
    {
      _id: new ObjectId(messageId),
      chatId: new ObjectId(chatId),
      userId: new ObjectId(userId),
    },
    {
      $set: {
        "feedback.rating": feedbackData.rating,
        "feedback.reason": feedbackData.reason ?? undefined,
        "feedback.comment": feedbackData.comment ?? undefined,
        "feedback.updatedAt": now,
        "feedback.createdAt": now,
      },
    },
    { returnDocument: "after" }
  );
}
