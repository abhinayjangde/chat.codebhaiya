import express from "express";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { objectIdSchema } from "../lib/validation.js";
import { Document } from "../models/document.model.js";
import { deleteDocumentVectors } from "../services/document-processing.service.js";
import { deleteDocumentFromS3 } from "../services/storage.service.js";

const router: express.Router = express.Router();

router.use(authenticateToken);

function getDocumentId(req: Request, res: Response): string | undefined {
  const rawDocumentId = Array.isArray(req.params.documentId)
    ? req.params.documentId[0]
    : req.params.documentId;
  const result = objectIdSchema.safeParse(rawDocumentId);

  if (!result.success) {
    res.status(400).json({ success: false, error: "Invalid document ID" });
    return undefined;
  }

  return result.data;
}

router.get(
  "/:documentId",
  async (req: Request, res: Response): Promise<void> => {
    const documentId = getDocumentId(req, res);
    if (!documentId) {
      return;
    }

    const document = await Document.findOne({
      _id: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(req.user!.userId),
    })
      .select("filename mimeType size status errorMessage chunkCount embeddingModel createdAt updatedAt")
      .lean();

    if (!document) {
      res.status(404).json({ success: false, error: "Document not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        document: {
          documentId: document._id.toString(),
          filename: document.filename,
          mimeType: document.mimeType,
          size: document.size,
          status: document.status,
          ...(document.errorMessage ? { errorMessage: document.errorMessage } : {}),
          chunkCount: document.chunkCount,
          ...(document.embeddingModel
            ? { embeddingModel: document.embeddingModel }
            : {}),
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      },
    });
  }
);

router.delete(
  "/:documentId",
  async (req: Request, res: Response): Promise<void> => {
    const documentId = getDocumentId(req, res);
    if (!documentId) {
      return;
    }

    const userId = req.user!.userId;
    const document = await Document.findOne({
      _id: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!document) {
      res.status(404).json({ success: false, error: "Document not found" });
      return;
    }

    try {
      await deleteDocumentVectors(userId, documentId);
      await deleteDocumentFromS3(document.s3Key);
      await Document.deleteOne({ _id: document._id });

      res.status(200).json({
        success: true,
        message: "Document deleted successfully",
        data: { documentId },
      });
    } catch (error) {
      console.error("Document deletion error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete document",
      });
    }
  }
);

export default router;
