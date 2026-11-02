import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

export const documentMetadataSchema = z
  .object({
    folder: z.string().trim().max(120).default("Unsorted"),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  })
  .passthrough();

export const collectionSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).default(""),
  })
  .passthrough();

export const collectionDocumentsSchema = z
  .object({
    documentIds: z.array(objectIdSchema).max(500),
  })
  .passthrough();
