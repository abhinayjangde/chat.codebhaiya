import type { McpTool } from "../mcp.js";
import type { CloudToolExecutionContext, CloudToolResult } from "./types.js";
import { getConnectorById } from "./catalog.js";
import { executeGithubTool, githubTools } from "./executors/github.executor.js";
import { executePostgresTool, postgresTools } from "./executors/postgres.executor.js";
import { executeMongodbTool, mongodbTools } from "./executors/mongodb.executor.js";
import { executeSupabaseTool, supabaseTools } from "./executors/supabase.executor.js";
import { executeLinearTool, linearTools } from "./executors/linear.executor.js";
import { executeNotionTool, notionTools } from "./executors/notion.executor.js";

export function getToolsForConnector(connectorId: string): McpTool[] {
  switch (connectorId) {
    case "github":
      return githubTools;
    case "postgres":
      return postgresTools;
    case "mongodb-atlas":
      return mongodbTools;
    case "supabase":
      return supabaseTools;
    case "linear":
      return linearTools;
    case "notion":
      return notionTools;
    default: {
      const def = getConnectorById(connectorId);
      return def?.defaultTools ?? [];
    }
  }
}

export async function executeCloudTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CloudToolExecutionContext
): Promise<CloudToolResult> {
  switch (ctx.connectorId) {
    case "github":
      return executeGithubTool(toolName, args, ctx);
    case "postgres":
      return executePostgresTool(toolName, args, ctx);
    case "mongodb-atlas":
      return executeMongodbTool(toolName, args, ctx);
    case "supabase":
      return executeSupabaseTool(toolName, args, ctx);
    case "linear":
      return executeLinearTool(toolName, args, ctx);
    case "notion":
      return executeNotionTool(toolName, args, ctx);
    default:
      return {
        isError: true,
        content: [{ type: "text", text: `Unsupported cloud connector "${ctx.connectorId}".` }],
      };
  }
}
