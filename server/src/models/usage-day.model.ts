import mongoose from "mongoose";

export interface UsageDayDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  /** Calendar day as "YYYY-MM-DD" (UTC). */
  day: string;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  uploadCount: number;
  uploadBytes: number;
  imageGenerationCount: number;
  expensiveModelCallCount: number;
}

const usageDaySchema = new mongoose.Schema<UsageDayDoc>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
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

usageDaySchema.index({ userId: 1, day: 1 }, { unique: true });
usageDaySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const UsageDay = mongoose.model<UsageDayDoc>("UsageDay", usageDaySchema);
