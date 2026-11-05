export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9000/api"
).replace(/\/$/, "");

export type Json = Record<string, unknown>;

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
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

export function authHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function parseResponseBody(response: Response): Promise<unknown> {
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

export function pickMessage(body: unknown, fallback: string): string {
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

export async function requestData<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    const reason = error instanceof Error ? `: ${error.message}` : "";
    throw new ApiError(
      `Unable to reach the API at ${API_BASE_URL}. Check that the server is running and CORS is configured${reason}`,
      0,
      error
    );
  }

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
