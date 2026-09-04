import mongoose, { type HydratedDocument, type Model } from "mongoose";

export const DOCUMENT_STATUSES = [
  "queued",
  "processing",
  "ready",
  "failed",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface IDocument {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  s3Key: string;
  status: DocumentStatus;
  errorMessage?: string;
  chunkCount: number;
  embeddingModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentDocument = HydratedDocument<IDocument>;
export type DocumentModel = Model<IDocument>;

const documentSchema = new mongoose.Schema<IDocument, DocumentModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    checksum: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    s3Key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      default: "queued",
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    embeddingModel: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ userId: 1, status: 1 });
documentSchema.index({ userId: 1, checksum: 1 });

export const Document = mongoose.model<IDocument, DocumentModel>(
  "Document",
  documentSchema
);
