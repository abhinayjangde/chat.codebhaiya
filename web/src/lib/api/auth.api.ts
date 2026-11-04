import type { AuthTokens, UserProfile } from "@/lib/types";
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

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const data = await requestData<{ tokens: AuthTokens }>("/auth/refresh", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refreshToken }),
    });
    return data.tokens;
  },

  async logout(accessToken: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
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
};
