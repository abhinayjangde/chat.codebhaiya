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
  status?: "active" | "pending_deletion";
  deletionScheduledAt?: string | null;
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

export interface SearchResultChat {
  _id: string;
  title: string;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultMessage {
  _id: string;
  chatId: string;
  chatTitle: string;
  role: "user" | "assistant";
  contentSnippet: string;
  isArchived: boolean;
  createdAt: string;
}

export interface SearchChatsResponse {
  chats: SearchResultChat[];
  messages: SearchResultMessage[];
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
  activeTool?: string;
  modelName?: string;
  errorMessage?: string;
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
  messageId?: string;
  userMessageId?: string;
  sources?: MessageSource[];
  usedTools?: UsedTool[];
  resume?: IResumeDoc;
}

export interface StreamResumeUpdateEvent {
  type: "resume_update";
  resume: IResumeDoc;
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
  | StreamResumeUpdateEvent
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

// -- Resume Builder types --

export type ResumeTemplate = "modern" | "classic" | "minimal" | "executive";
export type ResumeExportFormat = "docx" | "pdf" | "txt" | "latex";

export interface IResumePersonal {
  fullName: string;
  headline?: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

export interface IResumeExperience {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface IResumeEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  location?: string;
  startDate?: string;
  endDate: string;
  gpa?: string;
  highlights?: string[];
}

export interface IResumeSkillCategory {
  category: string;
  items: string[];
}

export interface IResumeProject {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  highlights: string[];
}

export interface IResumeCertification {
  name: string;
  issuer: string;
  date?: string;
  url?: string;
}

export interface IResumeCustomSection {
  title: string;
  items: string[];
}

export interface IResumeData {
  personalInfo: IResumePersonal;
  summary: string;
  skills: IResumeSkillCategory[];
  experience: IResumeExperience[];
  education: IResumeEducation[];
  projects: IResumeProject[];
  certifications?: IResumeCertification[];
  customSections?: IResumeCustomSection[];
}

export interface IResumeDoc {
  _id: string;
  chatId: string;
  userId: string;
  title: string;
  template: ResumeTemplate;
  targetRole?: string;
  targetCompany?: string;
  data: IResumeData;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  sessionId: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt?: string;
  lastActiveAt?: string;
  expiresAt: string;
  userAgent?: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  device?: string;
}

export interface ChatExportMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  modelName?: string;
  attachments?: unknown[];
  sources?: unknown[];
}

export interface ChatExportItem {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatExportMessage[];
}

export interface ChatHistoryExport {
  version: string;
  exportedAt: string;
  userId: string;
  totalChats: number;
  chats: ChatExportItem[];
}

