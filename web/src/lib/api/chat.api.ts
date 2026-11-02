import type {
  Attachment,
  ChatMessage,
  ChatSummary,
  ModelInfo,
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

export const chatApi = {
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

  async listMessages(
    chatId: string,
    accessToken: string
  ): Promise<MessagesEnvelope> {
    return requestData<MessagesEnvelope>(`/chat/${chatId}/messages`, {
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
};
