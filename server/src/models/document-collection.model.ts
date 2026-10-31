import mongoose from "mongoose";

const documentCollectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    documentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    }],
  },
  { timestamps: true }
);

documentCollectionSchema.index({ userId: 1, name: 1 }, { unique: true });

export const DocumentCollection = mongoose.model(
  "DocumentCollection",
  documentCollectionSchema
);
