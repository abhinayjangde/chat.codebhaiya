import type { McpTool } from "../mcp.js";
import type { CloudAuthType, CloudToolResult } from "./types.js";
import { executeCloudTool, getToolsForConnector } from "./executor.js";

export class CloudMcpClient {
  private connected = false;

  constructor(
    public readonly serverId: string,
    public readonly name: string,
    public readonly connectorId: string,
    public readonly config: Record<string, unknown> = {},
    public readonly authData: Record<string, string> = {},
    public readonly authType: CloudAuthType = "oauth",
    public readonly userId?: string | undefined
  ) {}

  async connect(): Promise<void> {
    this.connected = true;
  }

  async listTools(): Promise<McpTool[]> {
    return getToolsForConnector(this.connectorId);
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CloudToolResult> {
    return executeCloudTool(toolName, args, {
      connectorId: this.connectorId,
      serverName: this.name,
      config: this.config,
      authData: this.authData,
      authType: this.authType,
      userId: this.userId,
    });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  get isConnected(): boolean {
    return this.connected;
  }
}
