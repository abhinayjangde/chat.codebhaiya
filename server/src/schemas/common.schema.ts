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

export const paginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(20).optional(),
    before: objectIdSchema.optional(),
    after: objectIdSchema.optional(),
    around: objectIdSchema.optional(),
  })
  .refine(({ before, after }) => !(before && after), {
    message: "Use either before or after, not both",
  })
  .passthrough();
