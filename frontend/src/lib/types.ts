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
  title: string;
  url?: string;
  link?: string;
  snippet?: string;
  position?: number;
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
  attachments?: any[];
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
