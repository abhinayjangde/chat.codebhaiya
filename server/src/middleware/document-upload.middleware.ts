import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import multer from "multer";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
});

function removeTemporaryFile(req: Request, res: Response): void {
  const filePath = req.file?.path;
  if (!filePath) return;

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    void unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        console.error("Failed to remove temporary upload:", error);
      }
    });
  };

  res.once("finish", cleanup);
  res.once("close", cleanup);
}

export const uploadSingleDocumentFile: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        success: false,
        error: "File exceeds the 50 MB upload limit",
      });
      return;
    }

    if (error) {
      res.status(400).json({ success: false, error: "Invalid multipart upload" });
      return;
    }

    removeTemporaryFile(req, res);
    next();
  });
};
