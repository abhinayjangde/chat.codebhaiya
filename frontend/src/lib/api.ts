import type { AuthTokens, ChatMessage, ChatSummary, UserProfile, ModelInfo } from "@/lib/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9000/api"
).replace(/\/$/, "");

type Json = Record<string, unknown>;

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AuthEnvelope {
  user: UserProfile;
  tokens: AuthTokens;
}

interface MessagesEnvelope {
  messages: ChatMessage[];
  pagination: {
    nextCursor?: string;
    hasMore: boolean;
    total: number;
  };
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function authHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function pickMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }

  const error = (body as Json).error;
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  const message = (body as Json).message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
}

async function requestData<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      pickMessage(body, `Request failed (${response.status})`),
      response.status,
      body
    );
  }

  if (body && typeof body === "object" && "data" in (body as Json)) {
    return ((body as ApiEnvelope<T>).data ?? ({} as T)) as T;
  }

  return (body as T) ?? ({} as T);
}

export const apiClient = {
  async register(payload: {
    email: string;
    password: string;
    name: string;
  }): Promise<AuthEnvelope> {
    return requestData<AuthEnvelope>("/auth/register", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  async login(payload: {
    email: string;
    password: string;
  }): Promise<AuthEnvelope> {
    return requestData<AuthEnvelope>("/auth/login", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const data = await requestData<{ tokens: AuthTokens }>("/auth/refresh", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refreshToken }),
    });
    return data.tokens;
  },

  async logout(accessToken: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
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
  },

  async me(accessToken: string): Promise<{ user: UserProfile }> {
    return requestData<{ user: UserProfile }>("/auth/me", {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async listModels(): Promise<{ models: ModelInfo[]; default: string }> {
    return requestData<{ models: ModelInfo[]; default: string }>("/chat/models", {
      method: "GET",
      headers: authHeaders(),
    });
  },

  async listChats(accessToken: string): Promise<{ chats: ChatSummary[] }> {
    return requestData<{ chats: ChatSummary[] }>("/chat", {
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
    model?: string
  ): Promise<{ title: string; chatId: string }> {
    return requestData<{ title: string; chatId: string }>("/chat", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ message, model }),
    });
  },

  async streamMessage(
    chatId: string,
    message: string,
    accessToken: string,
    signal?: AbortSignal,
    model?: string
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${API_BASE_URL}/chat/${chatId}/stream`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ message, model }),
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
