export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPreferences {
  theme?: "light" | "dark";
  defaultModel?: string;
  language?: "english" | "hinglish";
}

export interface ModelInfo {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
}

export interface UserProfile {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
  preferences?: UserPreferences;
}

export interface ChatSummary {
  _id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSource {
  type?: "web" | "document";
  title: string;
  url?: string;
  link?: string;
  snippet?: string;
  position?: number;
  documentId?: string;
  filename?: string;
  pageNumber?: number;
  chunkIndex?: number;
  score?: number;
}

export type DocumentStatus = "queued" | "processing" | "ready" | "failed";

export interface Attachment {
  type: "image" | "audio" | "document" | "unknown";
  content?: string;
  documentId?: string;
  mimeType: string;
  name: string;
  size: number;
  status?: DocumentStatus;
  errorMessage?: string;
}

export interface DocumentStatusResponse {
  documentId: string;
  filename: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  errorMessage?: string;
  chunkCount: number;
  embeddingModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsedTool {
  name: string;
  input?: unknown;
  output?: string;
}

export interface ChatMessage {
  _id?: string;
  chatId?: string;
  userId?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  sources?: MessageSource[];
  usedTools?: UsedTool[];
  attachments?: Attachment[];
  isStreaming?: boolean;
  modelName?: string;
}

export interface StreamToolStartEvent {
  type: "tool_start";
  tool: string;
}

export interface StreamToolResultEvent {
  type: "tool_result";
  tool: string;
  output: string;
}

export interface StreamSourcesEvent {
  type: "sources";
  sources: MessageSource[];
}

export interface StreamTokenEvent {
  type: "token";
  content: string;
}

export interface StreamDoneEvent {
  type: "done";
  sources?: MessageSource[];
  usedTools?: UsedTool[];
}

export interface StreamErrorEvent {
  type: "error";
  error: string;
}

export type StreamEvent =
  | StreamToolStartEvent
  | StreamToolResultEvent
  | StreamSourcesEvent
  | StreamTokenEvent
  | StreamDoneEvent
  | StreamErrorEvent;
