import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

export const mcpServerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
    command: z.string().trim().min(1, "Command is required"),
    args: z.array(z.string().trim().min(1)).default([]),
    env: z.record(z.string().min(1, "Env var name is required"), z.string()).default({}),
    isActive: z.boolean().default(true),
  })
  .passthrough();

export const mcpServerIdSchema = objectIdSchema;
