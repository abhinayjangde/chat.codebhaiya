import express from "express";
import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { collectionDocumentsSchema, collectionSchema, documentMetadataSchema, objectIdSchema, parseBody } from "../lib/validation.js";
import { Document } from "../models/document.model.js";
import { DocumentCollection } from "../models/document-collection.model.js";
import { deleteDocumentVectors } from "../services/document-processing.service.js";
import { deleteDocumentFromS3, uploadDocumentToS3 } from "../services/storage.service.js";
import { enqueueDocumentProcessing } from "../queues/document.queue.js";
import crypto from "node:crypto";
import { autoSelectModel, getAgent } from "../lib/model.js";
import { retrieveRelevantChunks } from "../services/retrieval.service.js";

const router: express.Router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authenticateToken);

function ownerId(userId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(userId);
}

function serializeDocument(document: {
  _id: mongoose.Types.ObjectId;
  filename: string;
  mimeType: string;
  size: number;
  status: string;
  errorMessage?: string;
  chunkCount: number;
  embeddingModel?: string;
  createdAt: Date;
  updatedAt: Date;
  folder?: string;
  tags?: string[];
  collectionIds?: mongoose.Types.ObjectId[];
  version?: number;
  parentDocumentId?: mongoose.Types.ObjectId;
}) {
  return {
    documentId: document._id.toString(),
    filename: document.filename,
    mimeType: document.mimeType,
    size: document.size,
    status: document.status,
    ...(document.errorMessage ? { errorMessage: document.errorMessage } : {}),
    chunkCount: document.chunkCount,
    ...(document.embeddingModel ? { embeddingModel: document.embeddingModel } : {}),
    folder: document.folder ?? "Unsorted",
    tags: document.tags ?? [],
    collectionIds: (document.collectionIds ?? []).map((id) => id.toString()),
    version: document.version ?? 1,
    ...(document.parentDocumentId ? { parentDocumentId: document.parentDocumentId.toString() } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documents = await Document.find({ userId: ownerId(req.user!.userId) })
      .select("filename mimeType size status errorMessage chunkCount embeddingModel createdAt updatedAt folder tags collectionIds version parentDocumentId")
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data: { documents: documents.map(serializeDocument) } });
  } catch (error) {
    next(error);
  }
});

router.get("/collections", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collections = await DocumentCollection.find({ userId: ownerId(req.user!.userId) })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data: { collections } });
  } catch (error) {
    next(error);
  }
});

router.post("/collections", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseBody(collectionSchema, req.body);
    const collection = await DocumentCollection.create({ ...input, userId: ownerId(req.user!.userId) });
    res.status(201).json({ success: true, data: { collection } });
  } catch (error) {
    next(error);
  }
});

router.patch("/collections/:collectionId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionId = getDocumentId(req, res);
    if (!collectionId) return;
    const input = parseBody(collectionSchema, req.body);
    const collection = await DocumentCollection.findOneAndUpdate(
      { _id: collectionId, userId: ownerId(req.user!.userId) },
      { $set: input },
      { returnDocument: "after", runValidators: true }
    ).lean();
    if (!collection) {
      res.status(404).json({ success: false, error: "Collection not found" });
      return;
    }
    res.json({ success: true, data: { collection } });
  } catch (error) {
    next(error);
  }
});

router.put("/collections/:collectionId/documents", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collectionId = getDocumentId(req, res);
    if (!collectionId) return;
    const { documentIds } = parseBody(collectionDocumentsSchema, req.body);
    const validDocuments = await Document.find({
      _id: { $in: documentIds },
      userId: ownerId(req.user!.userId),
    }).select("_id").lean();
    const ids = validDocuments.map((document) => document._id);
    const collection = await DocumentCollection.findOneAndUpdate(
      { _id: collectionId, userId: ownerId(req.user!.userId) },
      { $set: { documentIds: ids } },
      { returnDocument: "after" }
    ).lean();
    if (!collection) {
      res.status(404).json({ success: false, error: "Collection not found" });
      return;
    }
    await Document.updateMany(
      { userId: ownerId(req.user!.userId), _id: { $in: ids } },
      { $addToSet: { collectionIds: collection._id } }
    );
    res.json({ success: true, data: { collection } });
  } catch (error) {
    next(error);
  }
});

router.patch("/:documentId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = getDocumentId(req, res);
    if (!documentId) return;
    const input = parseBody(documentMetadataSchema, req.body);
    const document = await Document.findOneAndUpdate(
      { _id: documentId, userId: ownerId(req.user!.userId) },
      { $set: input },
      { returnDocument: "after", runValidators: true }
    ).lean();
    if (!document) {
      res.status(404).json({ success: false, error: "Document not found" });
      return;
    }
    res.json({ success: true, data: { document: serializeDocument(document) } });
  } catch (error) {
    next(error);
  }
});

router.post("/:documentId/version", upload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  let s3Key: string | undefined;
  try {
    const documentId = getDocumentId(req, res);
    if (!documentId) return;
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    const previous = await Document.findOne({
      _id: documentId,
      userId: ownerId(req.user!.userId),
    }).lean();
    if (!previous) {
      res.status(404).json({ success: false, error: "Document not found" });
      return;
    }

    const filename = req.file.originalname.replace(/[/\\]/g, "_").trim() || previous.filename;
    const nextDocumentId = new mongoose.Types.ObjectId();
    s3Key = `documents/${req.user!.userId}/${nextDocumentId.toString()}/${filename}`;
    const checksum = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    await uploadDocumentToS3({
      key: s3Key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      metadata: {
        documentId: nextDocumentId.toString(),
        userId: req.user!.userId,
        checksum,
      },
    });

    const version = await Document.create({
      _id: nextDocumentId,
      userId: ownerId(req.user!.userId),
      filename,
      mimeType: req.file.mimetype.toLowerCase(),
      size: req.file.size,
      checksum,
      s3Key,
      status: "queued",
      ...(previous.folder ? { folder: previous.folder } : {}),
      tags: previous.tags,
      ...(previous.collectionIds ? { collectionIds: previous.collectionIds } : {}),
      version: (previous.version ?? 1) + 1,
      parentDocumentId: previous.parentDocumentId ?? previous._id,
    });

    await enqueueDocumentProcessing({
      documentId: version._id.toString(),
      userId: req.user!.userId,
      s3Key,
      mimeType: version.mimeType,
      filename: version.filename,
    });

    res.status(202).json({ success: true, data: { document: serializeDocument(version.toObject()) } });
  } catch (error) {
    if (s3Key) {
      await deleteDocumentFromS3(s3Key).catch((cleanupError) => {
        console.error("Failed to clean up version upload:", cleanupError);
      });
    }
    next(error);
  }
});

router.post("/:documentId/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = getDocumentId(req, res);
    if (!documentId) return;
    const document = await Document.findOne({ _id: documentId, userId: ownerId(req.user!.userId), status: "ready" }).lean();
    if (!document) {
      res.status(404).json({ success: false, error: "Ready document not found" });
      return;
    }
    const chunks = await retrieveRelevantChunks({
      query: "Summarize the main purpose, key points, findings, and actionable details in this document.",
      userId: req.user!.userId,
      documentIds: [documentId],
      limit: 8,
    });
    const context = chunks.map((chunk) => `[Page ${chunk.pageNumber ?? "?"}]\n${chunk.text}`).join("\n\n");
    const agent = await getAgent(await autoSelectModel("Summarize this document"), "english");
    const response = await agent.invoke({
      messages: [{ role: "user", content: `Create a concise, structured summary of ${document.filename} using only this context:\n${context}` }],
    });
    res.json({ success: true, data: { summary: response.messages.at(-1)?.content ?? "" } });
  } catch (error) {
    next(error);
  }
});

router.post("/:documentId/questions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = getDocumentId(req, res);
    if (!documentId) return;
    const document = await Document.findOne({ _id: documentId, userId: ownerId(req.user!.userId), status: "ready" }).lean();
    if (!document) {
      res.status(404).json({ success: false, error: "Ready document not found" });
      return;
    }
    const chunks = await retrieveRelevantChunks({
      query: "Identify the most useful concepts and facts someone should ask about in this document.",
      userId: req.user!.userId,
      documentIds: [documentId],
      limit: 8,
    });
    const context = chunks.map((chunk) => chunk.text).join("\n\n");
    const agent = await getAgent(await autoSelectModel("Generate questions about this document"), "english");
    const response = await agent.invoke({
      messages: [{ role: "user", content: `Generate 8 useful questions and short answers about ${document.filename}. Return JSON array with question and answer fields. Use only this context:\n${context}` }],
    });
    res.json({ success: true, data: { questions: response.messages.at(-1)?.content ?? "[]" } });
  } catch (error) {
    next(error);
  }
});

function getDocumentId(req: Request, res: Response): string | undefined {
  const rawDocumentId = req.params.documentId ?? req.params.collectionId;
  const value = Array.isArray(rawDocumentId) ? rawDocumentId[0] : rawDocumentId;
  const result = objectIdSchema.safeParse(value);

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
