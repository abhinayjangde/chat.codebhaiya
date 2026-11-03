import type {
  IResumeData,
  IResumeDoc,
  ResumeExportFormat,
  ResumeTemplate,
} from "@/lib/types";
import {
  API_BASE_URL,
  ApiError,
  authHeaders,
  requestData,
} from "./http";

export const resumeApi = {
  async getResume(
    chatId: string,
    accessToken: string
  ): Promise<IResumeDoc | null> {
    const res = await requestData<{ resume: IResumeDoc | null }>(
      `/chat/${chatId}/resume`,
      {
        method: "GET",
        headers: authHeaders(accessToken),
      }
    );
    return res.resume;
  },

  async updateResume(
    chatId: string,
    payload: {
      title?: string;
      template?: ResumeTemplate;
      targetRole?: string;
      targetCompany?: string;
      data: IResumeData;
    },
    accessToken: string
  ): Promise<IResumeDoc> {
    const res = await requestData<{ resume: IResumeDoc }>(
      `/chat/${chatId}/resume`,
      {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      }
    );
    return res.resume;
  },

  async downloadResume(
    chatId: string,
    format: ResumeExportFormat,
    accessToken: string
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/chat/${chatId}/resume/export?format=${format}`,
      {
        method: "GET",
        headers: authHeaders(accessToken),
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to export resume";
      try {
        const json = await response.json();
        if (json && typeof json.error === "string") {
          errorMessage = json.error;
        }
      } catch {
        // Ignored
      }
      throw new ApiError(errorMessage, response.status);
    }

    const disposition = response.headers.get("content-disposition");
    let filename = `Resume.${format === "latex" ? "tex" : format}`;
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },
};
