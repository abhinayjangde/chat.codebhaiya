import { authApi } from "./api/auth.api";
import { chatApi } from "./api/chat.api";
import { documentApi } from "./api/document.api";
import { mcpApi } from "./api/mcp.api";
import { resumeApi } from "./api/resume.api";

export { ApiError, API_BASE_URL } from "./api/http";
export type { AuthEnvelope } from "./api/auth.api";
export type { MessagesEnvelope } from "./api/chat.api";

export const apiClient = {
  ...authApi,
  ...chatApi,
  ...documentApi,
  ...mcpApi,
  ...resumeApi,
};
