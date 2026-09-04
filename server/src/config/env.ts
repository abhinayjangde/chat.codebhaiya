import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URL: z.string().trim().min(1, "MONGODB_URL is required"),

  OPENAI_API_KEY: z.string().trim().optional(),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-5-nano-2025-08-07"),
  GROQ_API_KEY: z.string().trim().optional(),
  JWT_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY: z.string().trim().min(1).default("15m"),
  JWT_REFRESH_EXPIRY: z.string().trim().min(1).default("7d"),
  CORS_ORIGINS: z.string().trim().min(1, "CORS_ORIGINS is required"),
  GOOGLE_API_KEY: z.string().trim().optional(),
  GOOGLE_EMBEDDING_MODEL: z.string().trim().default("text-embedding-004"),
  AWS_REGION: z.string().trim().default("us-east-1"),
  AWS_S3_BUCKET: z.string().trim().optional(),
  AWS_S3_ENDPOINT: z.string().trim().url().optional(),
  QDRANT_URL: z.string().trim().url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().trim().optional(),
  QDRANT_COLLECTION: z.string().trim().default("chat_documents"),
  REDIS_URL: z.string().trim().url().default("redis://localhost:6379"),
  DOCUMENT_QUEUE_NAME: z.string().trim().default("document-processing"),
  OLLAMA_API_KEY: z.string().trim().optional(),
  OLLAMA_BASE_URL: z.string().trim().default("https://api.ollama.com"),
  SARVAM_API_KEY: z.string().trim().optional(),
  MODEL_NAME: z.string().trim().optional(),
  // Render sets this automatically for every deployed service
  RENDER_EXTERNAL_URL: z.string().trim().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}

/**
 * Array of allowed CORS origins with whitespace trimmed and empty strings removed.
 * The `.filter(Boolean)` removes any empty strings that may result from the split operation,
 * ensuring only valid origin strings are included in the array.
 */
const corsOrigins = parsed.data.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (corsOrigins.length === 0) {
  throw new Error("Invalid environment configuration:\nCORS_ORIGINS must include at least one origin");
}

export const env = Object.freeze({
  ...parsed.data,
  corsOrigins,
});

export type AppEnv = typeof env;
