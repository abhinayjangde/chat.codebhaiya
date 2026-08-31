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

export const createChatSchema = z
  .object({
    message: z.string().trim().min(1, "Message is required"),
  })
  .passthrough();

export const chatMessageSchema = z
  .object({
    message: z.string().trim().min(1, "Message is required"),
    model: z.string().trim().optional().nullable(),
    language: z.string().trim().optional(),
    attachments: z
      .array(
        z.object({
          type: z.enum(["image", "audio", "document"]),
          content: z.string().trim().min(1, "Attachment content is required"),
          name: z.string().trim().min(1, "Attachment name is required"),
          mimeType: z.string().trim().min(1, "Attachment MIME type is required"),
          size: z.number().int().nonnegative().default(0),
        })
      )
      .optional(),
  })
  .passthrough();

export const paginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(20).optional(),
    before: z.string().trim().optional(),
    after: z.string().trim().optional(),
  })
  .passthrough();

export const renameChatSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer"),
  })
  .passthrough();

export const chatIdParamSchema = objectIdSchema;
