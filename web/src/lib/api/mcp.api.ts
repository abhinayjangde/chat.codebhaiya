import type {
  ListMcpToolsResponse,
  McpServer,
  McpServerFormData,
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
};
