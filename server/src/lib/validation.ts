import { z } from "zod";

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export function parseBody<T>(schema: z.ZodType<T>, value: unknown, errorMessage = "Invalid request payload"): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, issue?.message ?? errorMessage);
  }

  return result.data;
}

export const objectIdSchema = z
  .string()
  .trim()
  .min(1, "ID is required")
  .refine((value) => /^[a-f\d]{24}$/i.test(value), "Invalid ID format");

export const emailSchema = z.string().trim().email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be 50 characters or fewer");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
  })
  .passthrough();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().trim().min(1, "Password is required"),
  })
  .passthrough();

export const refreshTokenSchema = z
  .object({
    refreshToken: z.string().trim().min(1, "Refresh token is required"),
  })
  .passthrough();

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .passthrough();

export const preferencesSchema = z
  .object({
    systemInstructions: z
      .string()
      .trim()
      .max(4_000, "Custom instructions must be 4,000 characters or fewer"),
  })
  .passthrough();

const attachmentSchema = z
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

// Chat message schema extension: allow selecting MCP server IDs
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

export const paginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(20).optional(),
    before: objectIdSchema.optional(),
    after: objectIdSchema.optional(),
  })
  .refine(({ before, after }) => !(before && after), {
    message: "Use either before or after, not both",
  })
  .passthrough();

export const renameChatSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer"),
  })
  .passthrough();

export const chatIdParamSchema = objectIdSchema;

export const documentMetadataSchema = z.object({
  folder: z.string().trim().max(120).default("Unsorted"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
}).passthrough();

export const collectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
}).passthrough();

export const collectionDocumentsSchema = z.object({
  documentIds: z.array(objectIdSchema).max(500),
}).passthrough();

// -- MCP server schemas --

export const mcpServerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
  command: z.string().trim().min(1, "Command is required"),
  args: z.array(z.string().trim().min(1)).default([]),
  env: z.record(z.string().min(1, "Env var name is required"), z.string()).default({}),
  isActive: z.boolean().default(true),
}).passthrough();

export const mcpServerIdSchema = objectIdSchema;
