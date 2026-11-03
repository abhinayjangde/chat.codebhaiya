import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@langchain/core/tools";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { env } from "../config/env.js";
import { CloudMcpClient } from "./cloud-mcp/cloud-client.js";

/**
 * Shape of a tool advertised by an MCP server (from `listTools`).
 */
export interface McpTool {
  name: string;
  description: string | undefined;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Common interface shared by STDIO MCP clients and Managed Cloud MCP clients.
 */
export interface IMcpClient {
  serverId: string;
  name: string;
  connect(): Promise<void>;
  listTools(): Promise<McpTool[]>;
  callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{
    content: Array<{ type: string; text?: string | undefined }>;
    isError?: boolean | undefined;
  }>;
  disconnect(): Promise<void>;
  get isConnected(): boolean;
}

/**
 * Represents a configured MCP server for a user.
 */
export interface McpServerConfig {
  id: string;
  userId: string;
  name: string;
  serverType?: "custom" | "cloud";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cloudConnectorId?: string;
  cloudConfig?: Record<string, unknown>;
  authData?: Record<string, string>;
  authType?: "oauth" | "api_key" | "connection_string" | "none";
  isActive: boolean;
}

/**
 * Thin wrapper over an MCP stdio client + its advertised tools.
 */
export class McpClient implements IMcpClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  constructor(
    public readonly serverId: string,
    public readonly name: string,
    public readonly command: string,
    public readonly args: string[],
    public readonly env: Record<string, string>
  ) {
    this.client = new Client({
      name: "codebhaiya-mcp-client",
      version: "1.0.0",
    });
  }

  /**
   * Connect to the MCP server via stdio.
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.client = new Client({
      name: "codebhaiya-mcp-client",
      version: "1.0.0",
    });

    // Build the environment: inherit process env and overlay server-specific vars.
    const mergedEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...this.env,
    };

    let stderrOutput = "";
    let connectError: Error | null = null;
    let connectionResolved = false;

    const connectTimeout = setTimeout(() => {
      if (!connectionResolved) {
        connectError = new Error(
          `Connection to MCP server "${this.name}" timed out after 10 seconds.`
        );
      }
    }, 10_000);

    try {
      let spawnCommand = this.command;
      let spawnArgs = [...this.args];

      // On Windows, commands like npx, npm, pnpm are batch scripts (.cmd/.bat).
      // Node's spawn without shell throws ENOENT or EINVAL unless invoked through cmd.exe.
      if (process.platform === "win32") {
        const lower = spawnCommand.toLowerCase();
        if (
          lower === "npx" ||
          lower === "npm" ||
          lower === "pnpm" ||
          lower === "yarn" ||
          lower.endsWith(".cmd") ||
          lower.endsWith(".bat")
        ) {
          spawnCommand = "cmd.exe";
          spawnArgs = ["/c", this.command, ...this.args];
        }
      }

      this.transport = new StdioClientTransport({
        command: spawnCommand,
        args: spawnArgs,
        env: mergedEnv,
        stderr: "pipe",
      });

      // Capture stderr from the spawned process for better error messages.
      const stderrStream = this.transport.stderr;
      if (stderrStream) {
        stderrStream.on("data", (chunk: Buffer | string) => {
          stderrOutput += typeof chunk === "string" ? chunk : chunk.toString();
        });
      }

      this.transport.onerror = (err: Error) => {
        if (!connectionResolved) {
          connectError = err;
        }
        console.error(`MCP transport error for ${this.name}:`, err.message);
      };

      this.transport.onclose = () => {
        if (!connectionResolved && !connectError) {
          const stderrHint = stderrOutput
            ? `\nServer stderr: ${stderrOutput.slice(0, 500)}`
            : "";
          connectError = new Error(
            `MCP server "${this.name}" closed the connection unexpectedly.${stderrHint}`
          );
        }
      };

      await this.client.connect(this.transport);

      clearTimeout(connectTimeout);
      connectionResolved = true;
      this.connected = true;
    } catch (error) {
      clearTimeout(connectTimeout);
      connectionResolved = true;
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to connect to MCP server "${this.name}": ${message}${
          stderrOutput ? `\nServer stderr: ${stderrOutput.slice(0, 500)}` : ""
        }`
      );
    }

    if (connectError) {
      await this.disconnect();
      throw connectError;
    }
  }

  /**
   * List the tools exposed by the connected MCP server.
   */
  async listTools(): Promise<McpTool[]> {
    if (!this.connected) {
      await this.connect();
    }
    const result = await this.client.listTools();
    return (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? undefined,
      inputSchema: t.inputSchema as NonNullable<McpTool["inputSchema"]>,
    }));
  }

  /**
   * Call a tool exposed by the MCP server.
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  }> {
    if (!this.connected) {
      await this.connect();
    }
    const result = await this.client.callTool({ name: toolName, arguments: args });
    const contentArray = Array.isArray(result.content) ? result.content : [];
    return {
      content: contentArray.map((c) => ({
        type: String(c.type),
        text: (c as { text?: string }).text,
      })) as Array<{ type: string; text?: string }>,
      isError: Boolean(result.isError),
    };
  }

  /**
   * Disconnect from the MCP server.
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.close();
    } catch {
      // Ignore close errors; we're tearing down anyway.
    }
    this.transport = null;
    this.connected = false;
  }

  get isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Creates an IMcpClient instance based on serverType (custom stdio or managed cloud).
 */
export function createMcpClient(server: {
  _id: { toString(): string } | string;
  name: string;
  serverType?: "custom" | "cloud" | undefined;
  command?: string | undefined;
  args?: string[] | undefined;
  env?: Record<string, string> | Map<string, string> | undefined;
  cloudConnectorId?: string | undefined;
  cloudConfig?: Record<string, unknown> | undefined;
  authData?: Record<string, string> | Map<string, string> | undefined;
  authType?: "oauth" | "api_key" | "connection_string" | "none" | undefined;
  userId?: { toString(): string } | string | undefined;
}): IMcpClient {
  if (server.serverType === "cloud" && server.cloudConnectorId) {
    const authDataObj: Record<string, string> =
      server.authData instanceof Map
        ? Object.fromEntries(server.authData.entries())
        : (server.authData ?? {});
    return new CloudMcpClient(
      server._id.toString(),
      server.name,
      server.cloudConnectorId,
      server.cloudConfig ?? {},
      authDataObj,
      (server.authType as any) ?? "oauth",
      server.userId?.toString()
    );
  }

  const envObj: Record<string, string> =
    server.env instanceof Map
      ? Object.fromEntries(server.env.entries())
      : (server.env ?? {});

  return new McpClient(
    server._id.toString(),
    server.name,
    server.command || "npx",
    server.args || [],
    envObj
  );
}

/**
 * Registry of active MCP clients keyed by server id.
 */
export class McpClientRegistry {
  private clients = new Map<string, IMcpClient>();

  get(serverId: string): IMcpClient | undefined {
    return this.clients.get(serverId);
  }

  set(serverId: string, client: IMcpClient): void {
    this.clients.set(serverId, client);
  }

  delete(serverId: string): void {
    const client = this.clients.get(serverId);
    if (client) {
      // Fire-and-forget disconnect; don't block the response.
      void client.disconnect();
    }
    this.clients.delete(serverId);
  }

  async disconnectAll(): Promise<void> {
    await Promise.all([...this.clients.values()].map((c) => c.disconnect()));
    this.clients.clear();
  }
}

export const mcpClientRegistry = new McpClientRegistry();

/**
 * Maximum number of MCP servers a user may have connected at once.
 */
export const MAX_MCP_SERVERS_PER_USER =
  (env.MAX_MCP_SERVERS_PER_USER as number | undefined) ?? 10;

/**
 * Build LangChain tools from a list of MCP tool definitions.
 * Each MCP tool is wrapped so its arguments are forwarded to the MCP server.
 */
export function buildLangChainTools(
  clients: Map<string, IMcpClient>,
  mcpTools: Array<{ serverId: string; tool: McpTool }>
): Tool[] {
  return mcpTools.map(({ serverId, tool: mcpTool }) => {
    const client = clients.get(serverId);
    if (!client) {
      throw new Error(`MCP client for server ${serverId} is not connected`);
    }

    // Convert the MCP JSON-Schema inputSchema into a permissive zod schema so the
    // LLM can pass any object-shaped arguments through to the MCP server.
    const inputSchema = mcpTool.inputSchema ?? {
      type: "object",
      properties: {},
    };
    const schema = z
      .object({})
      .catchall(z.unknown())
      .describe(
        `${mcpTool.description ?? ""}\n\nMCP input schema: ${JSON.stringify(inputSchema)}`
      );

    return tool(
      async (input: Record<string, unknown>) => {
        const result = await client.callTool(mcpTool.name, input);

        // Concatenate all text content parts into a single string for the LLM.
        const parts = result.content
          .map((part) => (part.type === "text" ? part.text : ""))
          .filter(Boolean);

        let output = parts.join("\n");
        if (result.isError) {
          output = `[MCP tool error] ${output || "tool returned an error"}`;
        }
        if (!output) {
          output = "(no output)";
        }
        return output;
      },
      {
        name: `mcp_${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_${mcpTool.name}`,
        description:
          `[MCP:${client.name}] ${mcpTool.description ?? "No description provided"}`,
        schema,
      }
    ) as unknown as Tool;
  });
}
