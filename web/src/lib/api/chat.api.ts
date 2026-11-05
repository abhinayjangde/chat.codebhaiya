import type {
  Attachment,
  ChatHistoryExport,
  ChatMessage,
  ChatSummary,
  ModelInfo,
  SearchChatsResponse,
} from "@/lib/types";
import {
  API_BASE_URL,
  ApiError,
  authHeaders,
  parseResponseBody,
  pickMessage,
  requestData,
} from "./http";

export interface MessagesEnvelope {
  messages: ChatMessage[];
  pagination: {
    nextCursor?: string;
    hasMore: boolean;
    total: number;
  };
}

export interface GenerateImageResponse {
  userMessageId: string;
  assistantMessageId: string;
  attachment: Attachment;
  modelName: string;
}

export const chatApi = {
  async generateImage(
    chatId: string,
    prompt: string,
    accessToken: string,
    provider = "google"
  ): Promise<GenerateImageResponse> {
    return requestData<GenerateImageResponse>("/images/generate", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ chatId, prompt, provider }),
    });
  },

  async listModels(): Promise<{ models: ModelInfo[]; default: string }> {
    return requestData<{ models: ModelInfo[]; default: string }>("/chat/models", {
      method: "GET",
      headers: authHeaders(),
    });
  },

  async listChats(accessToken: string, archived?: boolean): Promise<{ chats: ChatSummary[] }> {
    const url = archived !== undefined ? `/chat?archived=${archived}` : "/chat";
    return requestData<{ chats: ChatSummary[] }>(url, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async searchChats(
    query: string,
    accessToken: string,
    limit = 30
  ): Promise<SearchChatsResponse> {
    const qs = new URLSearchParams({ q: query, limit: String(limit) }).toString();
    return requestData<SearchChatsResponse>(`/chat/search?${qs}`, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async listMessages(
    chatId: string,
    accessToken: string,
    params?: { limit?: number; before?: string; after?: string; around?: string }
  ): Promise<MessagesEnvelope> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.before) query.set("before", params.before);
    if (params?.after) query.set("after", params.after);
    if (params?.around) query.set("around", params.around);
    const qs = query.toString();
    const url = `/chat/${chatId}/messages${qs ? `?${qs}` : ""}`;
    return requestData<MessagesEnvelope>(url, {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async createChat(
    message: string,
    accessToken: string,
    model?: string,
    attachments?: Attachment[],
    language?: string,
    collectionId?: string,
    mcpServerIds?: string[]
  ): Promise<{ title: string; chatId: string }> {
    return requestData<{ title: string; chatId: string }>("/chat", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ message, model, attachments, language, collectionId, mcpServerIds }),
    });
  },

  async updateChat(
    chatId: string,
    updates: { title?: string; isPinned?: boolean; isArchived?: boolean },
    accessToken: string
  ): Promise<{ title?: string; chat?: ChatSummary }> {
    return requestData<{ title?: string; chat?: ChatSummary }>(`/chat/${chatId}`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(updates),
    });
  },

  async renameChat(
    chatId: string,
    title: string,
    accessToken: string
  ): Promise<{ title: string }> {
    const data = await chatApi.updateChat(chatId, { title }, accessToken);
    return { title: data.title ?? title };
  },

  async duplicateChat(
    chatId: string,
    accessToken: string
  ): Promise<{ chat: ChatSummary; chatId: string; title: string }> {
    return requestData<{ chat: ChatSummary; chatId: string; title: string }>(
      `/chat/${chatId}/duplicate`,
      {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({}),
      }
    );
  },

  async deleteChat(chatId: string, accessToken: string): Promise<void> {
    await requestData<void>(`/chat/${chatId}`, {
      method: "DELETE",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    });
  },

  async streamMessage(
    chatId: string,
    message: string,
    accessToken: string,
    signal?: AbortSignal,
    model?: string,
    attachments?: Attachment[],
    language?: string,
    collectionId?: string,
    replacement?: { editMessageId?: string; regenerateMessageId?: string },
    mcpServerIds?: string[]
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${API_BASE_URL}/chat/${chatId}/stream`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        message,
        model,
        attachments,
        language,
        collectionId,
        ...replacement,
        mcpServerIds,
      }),
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await parseResponseBody(response);
      throw new ApiError(
        pickMessage(body, `Request failed (${response.status})`),
        response.status,
        body
      );
    }

    if (!response.body) {
      throw new ApiError("Streaming response did not include a body", 500);
    }

    return response.body;
  },

  async exportAllChats(accessToken: string): Promise<ChatHistoryExport> {
    const response = await fetch(`${API_BASE_URL}/chat/export`, {
      method: "GET",
      headers: authHeaders(accessToken),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await parseResponseBody(response);
      throw new ApiError(
        pickMessage(body, `Request failed (${response.status})`),
        response.status,
        body
      );
    }

    return response.json();
  },

  async deleteAllChats(
    accessToken: string
  ): Promise<{ success: boolean; message: string; data?: { deletedChatsCount: number; deletedMessagesCount: number } }> {
    return requestData<{
      success: boolean;
      message: string;
      data?: { deletedChatsCount: number; deletedMessagesCount: number };
    }>("/chat", {
      method: "DELETE",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    });
  },
};
