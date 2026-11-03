import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

export const mcpServerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
    serverType: z.enum(["custom", "cloud"]).default("custom"),
    command: z.string().trim().min(1, "Command is required").optional(),
    args: z.array(z.string().trim().min(1)).default([]),
    env: z.record(z.string().min(1, "Env var name is required"), z.string()).default({}),
    cloudConnectorId: z.string().trim().optional(),
    cloudConfig: z.record(z.string(), z.unknown()).default({}),
    authType: z.enum(["oauth", "api_key", "connection_string", "none"]).default("none"),
    authData: z.record(z.string(), z.string()).default({}),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.serverType === "custom" && !data.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Command is required for custom STDIO MCP servers",
        path: ["command"],
      });
    }
  })
  .passthrough();

export const cloudConnectorConnectSchema = z.object({
  connectorId: z.enum([
    "github",
    "postgres",
    "mongodb-atlas",
    "supabase",
    "linear",
    "notion",
  ]),
  name: z.string().trim().min(2).max(100).optional(),
  authType: z.enum(["oauth", "api_key", "connection_string", "none"]).default("oauth"),
  authData: z.record(z.string(), z.string()).default({}),
  cloudConfig: z.record(z.string(), z.unknown()).default({}),
});

export const mcpServerIdSchema = objectIdSchema;
