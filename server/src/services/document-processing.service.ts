import crypto from "node:crypto";
import { createRequire } from "node:module";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "../config/env.js";
import { Document } from "../models/document.model.js";
import { downloadDocumentFromS3 } from "./storage.service.js";

const require = createRequire(import.meta.url);
const parsePdf = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

const CHUNK_SIZE = 4_000;
const CHUNK_OVERLAP = 500;

export interface DocumentChunk {
  text: string;
  index: number;
}

const qdrant = env.QDRANT_API_KEY
  ? new QdrantClient({ url: env.QDRANT_URL, apiKey: env.QDRANT_API_KEY })
  : new QdrantClient({ url: env.QDRANT_URL });

function getEmbeddings(): GoogleGenerativeAIEmbeddings {
  if (!env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not configured");
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey: env.GOOGLE_API_KEY,
    model: env.GOOGLE_EMBEDDING_MODEL,
    stripNewLines: false,
  });
}

function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(text: string): DocumentChunk[] {
  const normalizedText = normalizeText(text);
  if (!normalizedText) {
    return [];
  }

  const chunks: DocumentChunk[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    const end = Math.min(start + CHUNK_SIZE, normalizedText.length);
    const chunk = normalizedText.slice(start, end).trim();

    if (chunk) {
      chunks.push({ text: chunk, index: chunks.length });
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

function pointId(documentId: string, chunkIndex: number): string {
  const digest = crypto
    .createHash("sha256")
    .update(`${documentId}:${chunkIndex}`)
    .digest("hex")
    .slice(0, 32);

  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20)}`;
}

async function ensureCollection(vectorSize: number): Promise<void> {
  const exists = await qdrant.collectionExists(env.QDRANT_COLLECTION);
  if (exists) {
    return;
  }

  await qdrant.createCollection(env.QDRANT_COLLECTION, {
    vectors: {
      size: vectorSize,
      distance: "Cosine",
    },
  });
}

async function extractText(mimeType: string, buffer: Buffer): Promise<string> {
  if (mimeType === "application/pdf") {
    const parsed = await parsePdf(buffer);
    return parsed.text;
  }

  if (mimeType.startsWith("text/") || mimeType.startsWith("application/")) {
    return buffer.toString("utf-8");
  }

  return "";
}

export async function processDocument(documentId: string): Promise<void> {
  const document = await Document.findByIdAndUpdate(
    documentId,
    {
      status: "processing",
      errorMessage: undefined,
    },
    { new: true }
  );

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  try {
    const file = await downloadDocumentFromS3(document.s3Key);

    if (document.mimeType.startsWith("image/")) {
      await Document.findByIdAndUpdate(documentId, {
        status: "ready",
        chunkCount: 0,
        embeddingModel: undefined,
        errorMessage: undefined,
      });
      return;
    }

    const text = await extractText(document.mimeType, file);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("The uploaded document contains no extractable text");
    }

    const embeddings = getEmbeddings();
    const vectors = await embeddings.embedDocuments(chunks.map((chunk) => chunk.text));
    const firstVector = vectors[0];

    if (!firstVector) {
      throw new Error("Embedding provider returned no vectors");
    }

    await ensureCollection(firstVector.length);

    await qdrant.upsert(env.QDRANT_COLLECTION, {
      wait: true,
      points: chunks.map((chunk, index) => ({
        id: pointId(documentId, index),
        vector: vectors[index] ?? [],
        payload: {
          userId: document.userId.toString(),
          documentId,
          filename: document.filename,
          mimeType: document.mimeType,
          chunkIndex: chunk.index,
          text: chunk.text,
        },
      })),
    });

    await Document.findByIdAndUpdate(documentId, {
      status: "ready",
      chunkCount: chunks.length,
      embeddingModel: env.GOOGLE_EMBEDDING_MODEL,
      errorMessage: undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Document processing failed";

    await Document.findByIdAndUpdate(documentId, {
      status: "failed",
      errorMessage: errorMessage.slice(0, 1_000),
    });

    throw error;
  }
}
