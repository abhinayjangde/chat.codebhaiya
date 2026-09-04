import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Document } from "../models/document.model.js";

const DEFAULT_RESULT_LIMIT = 6;

const qdrant = env.QDRANT_API_KEY
  ? new QdrantClient({ url: env.QDRANT_URL, apiKey: env.QDRANT_API_KEY })
  : new QdrantClient({ url: env.QDRANT_URL });

export interface RetrievedChunk {
  documentId: string;
  filename: string;
  mimeType: string;
  chunkIndex: number;
  text: string;
  score: number;
}

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

export async function retrieveRelevantChunks(input: {
  query: string;
  userId: string;
  documentIds: string[];
  limit?: number;
}): Promise<RetrievedChunk[]> {
  const validDocumentIds = input.documentIds.filter((id) => mongoose.isValidObjectId(id));
  if (validDocumentIds.length === 0 || !input.query.trim()) {
    return [];
  }

  const ownedDocuments = await Document.find({
    _id: { $in: validDocumentIds },
    userId: new mongoose.Types.ObjectId(input.userId),
    status: "ready",
  })
    .select("_id")
    .lean();

  const ownedDocumentIds = ownedDocuments.map((document) => document._id.toString());
  if (ownedDocumentIds.length === 0) {
    return [];
  }

  const queryVector = await getEmbeddings().embedQuery(input.query.trim());
  const result = await qdrant.query(env.QDRANT_COLLECTION, {
    query: queryVector,
    limit: Math.min(Math.max(input.limit ?? DEFAULT_RESULT_LIMIT, 1), 20),
    with_payload: true,
    filter: {
      must: [
        {
          key: "userId",
          match: { value: input.userId },
        },
        {
          key: "documentId",
          match: { any: ownedDocumentIds },
        },
      ],
    },
  });

  return result.points.flatMap((point) => {
    const payload = point.payload;
    if (!payload || typeof payload !== "object") {
      return [];
    }

    const documentId = payload.documentId;
    const filename = payload.filename;
    const mimeType = payload.mimeType;
    const chunkIndex = payload.chunkIndex;
    const text = payload.text;

    if (
      typeof documentId !== "string" ||
      typeof filename !== "string" ||
      typeof mimeType !== "string" ||
      typeof chunkIndex !== "number" ||
      typeof text !== "string"
    ) {
      return [];
    }

    return [
      {
        documentId,
        filename,
        mimeType,
        chunkIndex,
        text,
        score: point.score,
      },
    ];
  });
}
