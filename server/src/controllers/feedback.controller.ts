import type { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { Feedback } from "../models/feedback.model.js";
import { parseBody, submitFeedbackSchema } from "../lib/validation.js";

export async function submitFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = parseBody(submitFeedbackSchema, req.body);
    const userId = req.user?.userId;

    const feedback = await Feedback.create({
      userId: userId ? new ObjectId(userId) : undefined,
      type: input.type,
      title: input.title ?? undefined,
      message: input.message,
      rating: input.rating ?? undefined,
      contactEmail: input.contactEmail || req.user?.email || undefined,
      metadata: input.metadata
        ? {
            url: input.metadata.url ?? undefined,
            userAgent: input.metadata.userAgent ?? undefined,
            chatId: input.metadata.chatId ?? undefined,
            screenSize: input.metadata.screenSize ?? undefined,
          }
        : undefined,
      status: "new",
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully. Thank you!",
      data: {
        feedbackId: feedback._id.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
