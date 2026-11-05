import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

export const submitFeedbackSchema = z.object({
  type: z.enum(["feedback", "bug_report", "feature_request"]).default("feedback"),
  title: z.string().trim().max(200).optional(),
  message: z
    .string()
    .trim()
    .min(3, "Feedback message must be at least 3 characters")
    .max(3000, "Message cannot exceed 3000 characters"),
  rating: z.number().int().min(1).max(5).optional(),
  contactEmail: z
    .string()
    .trim()
    .email("Invalid contact email")
    .optional()
    .or(z.literal("")),
  metadata: z
    .object({
      url: z.string().optional(),
      userAgent: z.string().optional(),
      chatId: objectIdSchema.optional(),
      screenSize: z.string().optional(),
    })
    .optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
