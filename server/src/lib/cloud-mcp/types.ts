import type { McpTool } from "../mcp.js";

export type CloudConnectorCategory = "Databases" | "Developer Tools" | "Productivity";

export type CloudAuthType = "oauth" | "api_key" | "connection_string" | "none";

export interface CloudConnectorParam {
  key: string;
  label: string;
  type: "text" | "password" | "textarea" | "select";
  placeholder?: string | undefined;
  description?: string | undefined;
  required?: boolean | undefined;
  default?: string | undefined;
  options?: Array<{ label: string; value: string }> | undefined;
}

export interface CloudConnectorDefinition {
  id: string;
  name: string;
  provider: string;
  tagline: string;
  description: string;
  category: CloudConnectorCategory;
  icon: string;
  badge?: string | undefined;
  authTypes: CloudAuthType[];
  defaultAuthType: CloudAuthType;
  features: string[];
  samplePrompts: string[];
  configFields: CloudConnectorParam[];
  authFields: CloudConnectorParam[];
  supportsOneClickOAuth: boolean;
  defaultTools: McpTool[];
}

export interface CloudToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean | undefined;
}

export interface CloudToolExecutionContext {
  connectorId: string;
  serverName: string;
  config: Record<string, unknown>;
  authData: Record<string, string>;
  authType?: CloudAuthType | undefined;
  userId?: string | undefined;
}
