import express from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { createRequire } from "module";
import { authenticateToken } from "../middleware/auth.middleware.js";

const require = createRequire(import.meta.url);
// pdf-parse v1 exports a function directly (CJS module)
const parsePdf = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

const router: express.Router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
// 10MB limit
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Helper function to extract text from a buffer (for .txt, .c, .py, etc.)
const extractTextFromBuffer = (buffer: Buffer): string => {
  return buffer.toString("utf-8");
};

router.use(authenticateToken);

// 1. Images (jpeg, png, webp) -> return base64
// 2. Audio (mp3, wav, etc.) -> return base64
// 3. PDFs -> extract text using pdf-parse
// 4. Text/Code files (txt, c, python, java, md, etc.) -> extract text as utf-8

router.post("/", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    const { mimetype, originalname, buffer, size } = req.file;

    // Define responses based on file type
    let extractResult = {
      type: "unknown",
      content: "",
      mimeType: mimetype,
      name: originalname,
      size: size,
    };

    if (mimetype.startsWith("image/")) {
      const base64Str = buffer.toString("base64");
      extractResult.type = "image";
      extractResult.content = `data:${mimetype};base64,${base64Str}`;
    } 
    // Audio handling
    else if (mimetype.startsWith("audio/")) {
      const base64Str = buffer.toString("base64");
      extractResult.type = "audio";
      extractResult.content = `data:${mimetype};base64,${base64Str}`;
    }
    // PDF handling
    else if (mimetype === "application/pdf") {
      try {
        const data = await parsePdf(buffer);
        extractResult.type = "document";
        extractResult.content = data.text;
      } catch (err: any) {
        res.status(500).json({ success: false, error: "Failed to parse PDF: " + err.message });
        return;
      }
    } 
    // Text and Code files
    else if (
      mimetype.startsWith("text/") ||
      mimetype === "application/json" ||
      mimetype === "application/javascript" ||
      mimetype === "application/x-javascript" ||
      originalname.endsWith(".c") ||
      originalname.endsWith(".cpp") ||
      originalname.endsWith(".js") ||
      originalname.endsWith(".ts") ||
      originalname.endsWith(".py") ||
      originalname.endsWith(".java") ||
      originalname.endsWith(".md") ||
      originalname.endsWith(".mdx") ||
      originalname.endsWith(".sh") ||
      originalname.endsWith(".csv") ||
      originalname.endsWith(".log")
    ) {
      extractResult.type = "document";
      extractResult.content = extractTextFromBuffer(buffer);
    } 
    // DOCX (Basic fallback, ideally use mammoth for better docx support, but text works for raw XML/text)
    // For proper DOCX, we would normally use 'mammoth' or 'docx-extractor', but let's 
    // try to just return an error or parse it lightly if possible.
    // To simplify for now, we will return an error for unsupported types if it's not handled above.
    else {
      res.status(400).json({
        success: false,
        error: `Unsupported file type: ${mimetype}. Please upload an Audio file, PDF, Image, or plain text/code file.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: extractResult,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: "Internal server error during file upload" });
  }
});

export default router;
