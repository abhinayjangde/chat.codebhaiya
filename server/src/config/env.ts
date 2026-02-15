import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URL: z.string().trim().min(1, "MONGODB_URL is required"),
  OPENAI_API_KEY: z.string().trim().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-5-mini-2025-08-07"),
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
  OLLAMA_API_KEY: z.string().trim().optional(),
  MODEL_NAME: z.string().trim().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid environment configuration:\n${details}`);
}

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
