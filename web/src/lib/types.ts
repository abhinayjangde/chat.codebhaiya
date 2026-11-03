export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPreferences {
  theme?: "light" | "dark";
  defaultModel?: string;
  language?: "english" | "hinglish";
  systemInstructions?: string;
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
  isPinned?: boolean;
  isArchived?: boolean;
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
  folder?: string;
  tags?: string[];
  collectionIds?: string[];
  version?: number;
  parentDocumentId?: string;
}

export interface DocumentCollection {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  documentIds: string[];
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

// -- MCP types --

export type McpServerType = "custom" | "cloud";

export interface McpServer {
  _id: string;
  userId: string;
  name: string;
  serverType?: McpServerType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cloudConnectorId?: string;
  cloudConfig?: Record<string, unknown>;
  authType?: string;
  metadata?: {
    icon?: string;
    description?: string;
    category?: string;
    provider?: string;
    badge?: string;
  };
  isActive: boolean;
  lastConnectedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface McpServerFormData {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  isActive: boolean;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface ListMcpToolsResponse {
  tools: McpTool[];
}

export interface CloudConnectorParam {
  key: string;
  label: string;
  type: "text" | "password" | "textarea" | "select";
  placeholder?: string;
  description?: string;
  required?: boolean;
  default?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface CloudConnector {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  description: string;
  category: "Databases" | "Developer Tools" | "Productivity";
  icon: string;
  badge?: string;
  authTypes: Array<"oauth" | "api_key" | "connection_string" | "none">;
  defaultAuthType: "oauth" | "api_key" | "connection_string" | "none";
  features: string[];
  samplePrompts: string[];
  configFields: CloudConnectorParam[];
  authFields: CloudConnectorParam[];
  supportsOneClickOAuth: boolean;
  defaultTools: McpTool[];
  isConnected?: boolean;
  connectedServerId?: string;
  serverName?: string;
  lastConnectedAt?: string;
  installedConfig?: Record<string, unknown>;
}

export interface MarketplaceResponse {
  connectors: CloudConnector[];
  totalCount: number;
  connectedCount: number;
}

export interface ConnectCloudPayload {
  connectorId: string;
  name?: string;
  authType?: "oauth" | "api_key" | "connection_string" | "none";
  authData?: Record<string, string>;
  cloudConfig?: Record<string, unknown>;
}
