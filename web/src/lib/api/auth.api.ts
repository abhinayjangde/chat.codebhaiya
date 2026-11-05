import type { AuthTokens, UserProfile, UserSession } from "@/lib/types";
import {
  API_BASE_URL,
  ApiError,
  authHeaders,
  parseResponseBody,
  pickMessage,
  requestData,
} from "./http";

export interface AuthEnvelope {
  user: UserProfile;
  tokens: AuthTokens;
}

export const authApi = {
  async uploadProfilePicture(file: File, accessToken: string): Promise<{ profilePictureUpdatedAt: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/auth/profile-picture`, {
      method: "PUT",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
      cache: "no-store",
    });
    const body = await parseResponseBody(response);
    if (!response.ok) {
      throw new ApiError(pickMessage(body, `Request failed (${response.status})`), response.status, body);
    }
    const data = (body as { data?: { profilePictureUpdatedAt?: string } } | null)?.data;
    if (!data?.profilePictureUpdatedAt) throw new ApiError("The uploaded picture could not be confirmed", response.status, body);
    return { profilePictureUpdatedAt: data.profilePictureUpdatedAt };
  },

  async getProfilePicture(accessToken: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/auth/profile-picture`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await parseResponseBody(response);
      throw new ApiError(pickMessage(body, `Request failed (${response.status})`), response.status, body);
    }
    return response.blob();
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return requestData<{ message: string }>("/auth/password/reset-request", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return requestData<{ message: string }>("/auth/password/reset", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ token, password }),
    });
  },

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

  async refresh(): Promise<AuthTokens> {
    const data = await requestData<{ tokens: AuthTokens }>("/auth/refresh", {
      method: "POST",
      headers: authHeaders(),
    });
    return data.tokens;
  },

  async logout(accessToken: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
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

  async updatePreferences(
    systemInstructions: string,
    accessToken: string
  ): Promise<{ user: UserProfile }> {
    return requestData<{ user: UserProfile }>("/auth/preferences", {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ systemInstructions }),
    });
  },

  async deleteAccount(
    accessToken: string,
    confirmation: string = "confirm"
  ): Promise<{ message: string; deletionScheduledAt?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/account`, {
      method: "DELETE",
      credentials: "include",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ confirmation }),
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

    if (body && typeof body === "object") {
      const data = (body as Record<string, unknown>).data as Record<string, unknown> | undefined;
      return {
        message:
          ((body as Record<string, unknown>).message as string) ||
          "Account scheduled for deletion",
        deletionScheduledAt: data?.deletionScheduledAt as string | undefined,
      };
    }

    return { message: "Account scheduled for deletion" };
  },

  async recoverAccount(payload: {
    email: string;
    password: string;
  }): Promise<AuthEnvelope> {
    return requestData<AuthEnvelope>("/auth/recover", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
  },

  async changePassword(
    currentPassword: string,
    newPassword: string,
    accessToken: string
  ): Promise<void> {
    await requestData<void>("/auth/password", {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async listSessions(accessToken: string): Promise<{ sessions: UserSession[] }> {
    return requestData<{ sessions: UserSession[] }>("/auth/sessions", {
      method: "GET",
      headers: authHeaders(accessToken),
    });
  },

  async revokeSession(
    sessionId: string,
    accessToken: string
  ): Promise<{ success: boolean; isCurrent?: boolean; sessionId?: string }> {
    return requestData<{ success: boolean; isCurrent?: boolean; sessionId?: string }>(
      `/auth/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        headers: authHeaders(accessToken),
      }
    );
  },

  async revokeOtherSessions(
    accessToken: string
  ): Promise<{ success: boolean; revokedCount: number }> {
    return requestData<{ success: boolean; revokedCount: number }>(
      "/auth/sessions/revoke-others",
      {
        method: "POST",
        headers: authHeaders(accessToken),
      }
    );
  },
};
