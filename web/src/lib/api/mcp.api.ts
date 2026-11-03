import type {
  ConnectCloudPayload,
  ListMcpToolsResponse,
  MarketplaceResponse,
  McpServer,
  McpServerFormData,
  McpTool,
} from "@/lib/types";
import { authHeaders, requestData } from "./http";

export const mcpApi = {
  async listMcpServers(
    accessToken: string
  ): Promise<{ servers: McpServer[] }> {
    return requestData<{ servers: McpServer[] }>("/mcp/servers", {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async createMcpServer(
    data: McpServerFormData,
    accessToken: string
  ): Promise<{ server: McpServer }> {
    return requestData<{ server: McpServer }>("/mcp/servers", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
  },

  async updateMcpServer(
    id: string,
    data: Partial<McpServerFormData>,
    accessToken: string
  ): Promise<{ server: McpServer }> {
    return requestData<{ server: McpServer }>(`/mcp/servers/${id}`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data),
    });
  },

  async deleteMcpServer(
    id: string,
    accessToken: string
  ): Promise<void> {
    await requestData<void>(`/mcp/servers/${id}`, {
      method: "DELETE",
      headers: authHeaders(accessToken),
    });
  },

  async listMcpServerTools(
    id: string,
    accessToken: string
  ): Promise<ListMcpToolsResponse> {
    return requestData<ListMcpToolsResponse>(`/mcp/servers/${id}/tools`, {
      method: "POST",
      headers: authHeaders(accessToken),
    });
  },

  async getMarketplace(
    accessToken: string
  ): Promise<MarketplaceResponse> {
    return requestData<MarketplaceResponse>("/mcp/marketplace", {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async connectCloudConnector(
    payload: ConnectCloudPayload,
    accessToken: string
  ): Promise<{ server: McpServer; toolCount: number; tools: McpTool[] }> {
    return requestData<{ server: McpServer; toolCount: number; tools: McpTool[] }>(
      "/mcp/marketplace/connect",
      {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      }
    );
  },

  async disconnectCloudConnector(
    connectorId: string,
    accessToken: string
  ): Promise<{ message: string }> {
    return requestData<{ message: string }>(
      `/mcp/marketplace/disconnect/${connectorId}`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
      }
    );
  },

  async initOAuth(
    connectorId: string,
    accessToken: string
  ): Promise<{ connectorId: string; provider: string; name: string; oauthUrl: string; state: string }> {
    return requestData<{ connectorId: string; provider: string; name: string; oauthUrl: string; state: string }>(
      `/mcp/marketplace/oauth/init/${connectorId}`,
      {
        method: "GET",
        headers: authHeaders(accessToken),
      }
    );
  },
};
