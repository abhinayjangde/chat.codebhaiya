import mongoose, { type HydratedDocument, type Model } from "mongoose";

export interface IFeedback {
  userId?: mongoose.Types.ObjectId | undefined;
  type: "feedback" | "bug_report" | "feature_request";
  title?: string | undefined;
  message: string;
  rating?: number | undefined;
  contactEmail?: string | undefined;
  metadata?: {
    url?: string | undefined;
    userAgent?: string | undefined;
    chatId?: string | undefined;
    screenSize?: string | undefined;
  } | undefined;
  status: "new" | "reviewed" | "resolved" | "archived";
  createdAt: Date;
}

export type FeedbackDocument = HydratedDocument<IFeedback>;
export type FeedbackModel = Model<IFeedback>;

const feedbackSchema = new mongoose.Schema<IFeedback, FeedbackModel>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  type: {
    type: String,
    enum: ["feedback", "bug_report", "feature_request"],
    default: "feedback",
    required: true,
    index: true,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 255,
  },
  metadata: {
    url: String,
    userAgent: String,
    chatId: String,
    screenSize: String,
  },
  status: {
    type: String,
    enum: ["new", "reviewed", "resolved", "archived"],
    default: "new",
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export const Feedback = mongoose.model<IFeedback, FeedbackModel>("Feedback", feedbackSchema);
