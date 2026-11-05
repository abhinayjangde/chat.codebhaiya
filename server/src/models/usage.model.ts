import mongoose from "mongoose";

export interface UsagePeriodDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  /** Calendar month as "YYYY-MM" (UTC). */
  period: string;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  uploadCount: number;
  uploadBytes: number;
  imageGenerationCount: number;
  expensiveModelCallCount: number;
  updatedAt: Date;
}

const usagePeriodSchema = new mongoose.Schema<UsagePeriodDoc>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: { type: String, required: true },
    messageCount: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    uploadCount: { type: Number, default: 0 },
    uploadBytes: { type: Number, default: 0 },
    imageGenerationCount: { type: Number, default: 0 },
    expensiveModelCallCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

usagePeriodSchema.index({ userId: 1, period: 1 }, { unique: true });

export const UsagePeriod = mongoose.model<UsagePeriodDoc>(
  "UsagePeriod",
  usagePeriodSchema
);
