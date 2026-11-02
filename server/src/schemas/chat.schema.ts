import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

export const attachmentSchema = z
  .object({
    type: z.enum(["image", "audio", "document"]),
    content: z.string().trim().optional(),
    documentId: objectIdSchema.optional(),
    name: z.string().trim().min(1, "Attachment name is required"),
    mimeType: z.string().trim().min(1, "Attachment MIME type is required"),
    size: z.number().int().nonnegative().default(0),
  })
  .superRefine((attachment, context) => {
    if (attachment.type === "document" && !attachment.documentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Document attachment ID is required",
        path: ["documentId"],
      });
    }

    if (attachment.type !== "document" && !attachment.documentId && !attachment.content) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Attachment document ID is required",
        path: ["documentId"],
      });
    }
  });

export const mcpServerIdsSchema = z
  .array(objectIdSchema)
  .max(10, "You can select up to 10 MCP servers per chat")
  .optional()
  .nullable();

export const createChatSchema = z
  .object({
    message: z.string().trim().default(""),
    attachments: z.array(attachmentSchema).optional(),
    mcpServerIds: mcpServerIdsSchema,
  })
  .superRefine((chat, context) => {
    if (!chat.message && (!chat.attachments || chat.attachments.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Message or attachment is required",
        path: ["message"],
      });
    }
  })
  .passthrough();

export const chatMessageSchema = z
  .object({
    message: z.string().trim().default(""),
    editMessageId: objectIdSchema.optional(),
    regenerateMessageId: objectIdSchema.optional(),
    model: z.string().trim().optional().nullable(),
    language: z.string().trim().optional(),
    attachments: z.array(attachmentSchema).optional(),
    collectionId: objectIdSchema.optional(),
    mcpServerIds: mcpServerIdsSchema,
  })
  .superRefine((chat, context) => {
    if (!chat.message && (!chat.attachments || chat.attachments.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Message or attachment is required",
        path: ["message"],
      });
    }
  })
  .passthrough();

export const updateChatSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer").optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.isPinned !== undefined || data.isArchived !== undefined,
    {
      message: "At least one field (title, isPinned, isArchived) must be provided",
    }
  )
  .passthrough();

export const renameChatSchema = updateChatSchema;

export const listChatsQuerySchema = z
  .object({
    archived: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
  })
  .passthrough();

export const chatIdParamSchema = objectIdSchema;
