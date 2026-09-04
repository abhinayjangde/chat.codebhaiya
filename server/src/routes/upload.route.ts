import crypto from "node:crypto";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { Chat } from "../models/chat.model.js";
import { objectIdSchema } from "../lib/validation.js";
import { Document } from "../models/document.model.js";
import { enqueueDocumentProcessing } from "../queues/document.queue.js";
import { deleteDocumentFromS3, uploadDocumentToS3 } from "../services/storage.service.js";

const router: express.Router = express.Router();
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
});

function uploadSingleFile(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        success: false,
        error: "File exceeds the 50 MB upload limit",
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: "Invalid multipart upload",
    });
  });
}

const CODE_FILE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".css",
  ".csv",
  ".go",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".log",
  ".md",
  ".mdx",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

const IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safeFilename(filename: string): string {
  const normalized = filename
    .replace(/[/\\]/g, "_")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "uploaded-file";
}

function isSupportedFile(filename: string, mimeType: string): boolean {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();

  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "application/x-javascript" ||
    CODE_FILE_EXTENSIONS.has(extension) ||
    IMAGE_MIME_TYPES.has(mimeType)
  );
}

router.use(authenticateToken);

router.post(
  "/",
  uploadSingleFile,
  async (req: Request, res: Response): Promise<void> => {
    let documentId: mongoose.Types.ObjectId | undefined;
    let s3Key: string | undefined;

    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No file uploaded" });
        return;
      }

      const { mimetype, originalname, buffer, size } = req.file;
      const filename = safeFilename(originalname);
      const mimeType = mimetype.toLowerCase();

      if (mimeType.startsWith("video/")) {
        res.status(415).json({
          success: false,
          error: "Video files are not supported",
        });
        return;
      }

      if (!isSupportedFile(filename, mimeType)) {
        res.status(415).json({
          success: false,
          error: "Unsupported file type. Upload a PDF, text/code file, or image.",
        });
        return;
      }

      const userId = req.user!.userId;
      const requestedChatId =
        typeof req.body.chatId === "string" ? req.body.chatId : undefined;

      if (requestedChatId && !objectIdSchema.safeParse(requestedChatId).success) {
        res.status(400).json({ success: false, error: "Invalid chat ID" });
        return;
      }

      if (requestedChatId) {
        const chat = await Chat.exists({
          _id: new mongoose.Types.ObjectId(requestedChatId),
          userId: new mongoose.Types.ObjectId(userId),
        });

        if (!chat) {
          res.status(404).json({ success: false, error: "Chat not found" });
          return;
        }
      }

      documentId = new mongoose.Types.ObjectId();
      s3Key = `documents/${userId}/${documentId.toString()}/${filename}`;
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

      await uploadDocumentToS3({
        key: s3Key,
        body: buffer,
        contentType: mimeType,
        metadata: {
          documentId: documentId.toString(),
          userId,
          checksum,
        },
      });

      const document = await Document.create({
        _id: documentId,
        userId: new mongoose.Types.ObjectId(userId),
        ...(requestedChatId
          ? { chatId: new mongoose.Types.ObjectId(requestedChatId) }
          : {}),
        filename,
        mimeType,
        size,
        checksum,
        s3Key,
        status: "queued",
      });

      await enqueueDocumentProcessing({
        documentId: document._id.toString(),
        userId,
        s3Key,
        mimeType,
        filename,
      });

      res.status(202).json({
        success: true,
        data: {
          documentId: document._id.toString(),
          filename: document.filename,
          mimeType: document.mimeType,
          size: document.size,
          status: document.status,
        },
      });
    } catch (error) {
      if (documentId) {
        await Document.findByIdAndDelete(documentId).catch((cleanupError) => {
          console.error("Failed to clean up document metadata:", cleanupError);
        });
      }

      if (s3Key) {
        await deleteDocumentFromS3(s3Key).catch((cleanupError) => {
          console.error("Failed to clean up uploaded S3 object:", cleanupError);
        });
      }

      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to store and queue document",
      });
    }
  }
);

export default router;
