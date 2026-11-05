import type {
  Attachment,
  DocumentCollection,
  DocumentStatusResponse,
} from "@/lib/types";
import {
  API_BASE_URL,
  ApiEnvelope,
  ApiError,
  authHeaders,
  parseResponseBody,
  pickMessage,
  requestData,
} from "./http";

export const documentApi = {
  async uploadFile(file: File, accessToken: string): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });

    const body = await parseResponseBody(response);
    if (!response.ok) {
      throw new ApiError(
        pickMessage(body, `Upload failed (${response.status})`),
        response.status,
        body
      );
    }
    const data = (body as ApiEnvelope<{
      documentId: string;
      filename: string;
      mimeType: string;
      size: number;
      status: DocumentStatusResponse["status"];
    }>).data;

    if (!data?.documentId) {
      throw new ApiError("Upload response did not include a document ID", 500, body);
    }

    return {
      type: file.type.startsWith("image/") ? "image" : "document",
      documentId: data.documentId,
      mimeType: data.mimeType,
      name: data.filename,
      size: data.size,
      status: data.status,
    };
  },

  async getDocumentStatus(
    documentId: string,
    accessToken: string
  ): Promise<DocumentStatusResponse> {
    const data = await requestData<{ document: DocumentStatusResponse }>(
      `/documents/${documentId}`,
      {
        method: "GET",
        headers: authHeaders(accessToken),
      }
    );

    return data.document;
  },

  async listDocuments(accessToken: string): Promise<{ documents: DocumentStatusResponse[] }> {
    return requestData<{ documents: DocumentStatusResponse[] }>("/documents", {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async updateDocumentMetadata(
    documentId: string,
    metadata: { folder: string; tags: string[] },
    accessToken: string
  ): Promise<{ document: DocumentStatusResponse }> {
    return requestData<{ document: DocumentStatusResponse }>(`/documents/${documentId}`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(metadata),
    });
  },

  async uploadDocumentVersion(
    documentId: string,
    file: File,
    accessToken: string
  ): Promise<{ document: DocumentStatusResponse }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/version`, {
      method: "POST",
      credentials: "include",
      headers: accessToken ? { Authorization: "Bearer " + accessToken } : {},
      body: formData,
      cache: "no-store",
    });
    const body = await parseResponseBody(response);
    if (!response.ok) {
      throw new ApiError(pickMessage(body, `Version upload failed (${response.status})`), response.status, body);
    }
    return ((body as ApiEnvelope<{ document: DocumentStatusResponse }>).data ?? {}) as { document: DocumentStatusResponse };
  },

  async listCollections(accessToken: string): Promise<{ collections: DocumentCollection[] }> {
    return requestData<{ collections: DocumentCollection[] }>("/documents/collections", {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async createCollection(name: string, description: string, accessToken: string): Promise<{ collection: DocumentCollection }> {
    return requestData<{ collection: DocumentCollection }>("/documents/collections", {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name, description }),
    });
  },

  async setCollectionDocuments(collectionId: string, documentIds: string[], accessToken: string): Promise<{ collection: DocumentCollection }> {
    return requestData<{ collection: DocumentCollection }>(`/documents/collections/${collectionId}/documents`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ documentIds }),
    });
  },

  async deleteCollection(collectionId: string, accessToken: string): Promise<void> {
    await requestData<void>(`/documents/collections/${collectionId}`, {
      method: "DELETE",
      headers: authHeaders(accessToken),
    });
  },

  async summarizeDocument(documentId: string, accessToken: string): Promise<{ summary: string }> {
    return requestData<{ summary: string }>(`/documents/${documentId}/summary`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    });
  },

  async generateDocumentQuestions(documentId: string, accessToken: string): Promise<{ questions: string }> {
    return requestData<{ questions: string }>(`/documents/${documentId}/questions`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    });
  },
};
