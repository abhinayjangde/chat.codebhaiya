"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ApiError, apiClient } from "@/lib/api";
import {
  clearStoredSession,
  readStoredTokens,
  readStoredUser,
  writeStoredTokens,
  writeStoredUser,
} from "@/lib/storage";
import type { AuthTokens, UserProfile } from "@/lib/types";
import { getErrorMessage } from "@/lib/chat-utils";

export function useAuthSession() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setTokens(null);
    setUser(null);
  }, []);

  const refreshAccess = useCallback(async (): Promise<AuthTokens | null> => {
    if (!tokens) {
      return null;
    }

    try {
      const refreshed = await apiClient.refresh(tokens.refreshToken);
      setTokens(refreshed);
      writeStoredTokens(refreshed);
      return refreshed;
    } catch {
      clearSession();
      return null;
    }
  }, [tokens, clearSession]);

  const runWithSession = useCallback(
    async <T,>(operation: (accessToken: string) => Promise<T>): Promise<T> => {
      if (!tokens) {
        throw new Error("Please Log in to continue.");
      }

      try {
        return await operation(tokens.accessToken);
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          (error.status !== 401 && error.status !== 403)
        ) {
          throw error;
        }

        const refreshed = await refreshAccess();
        if (!refreshed) {
          throw new Error("Session expired. Please log in again.");
        }

        return operation(refreshed.accessToken);
      }
    },
    [tokens, refreshAccess]
  );

  useEffect(() => {
    setHydrated(true);
    const storedTokens = readStoredTokens();
    const storedUser = readStoredUser();

    if (storedTokens) {
      setTokens(storedTokens);
    }
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (hydrated && !tokens) {
      router.replace("/login");
    }
  }, [hydrated, tokens, router]);

  const handleAuthSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!email.trim() || !password.trim()) {
        setAuthError("Email and password are required.");
        return;
      }

      if (authMode === "register" && !name.trim()) {
        setAuthError("Name is required for registration.");
        return;
      }

      setIsAuthLoading(true);
      setAuthError(null);

      try {
        const authData =
          authMode === "login"
            ? await apiClient.login({
                email: email.trim().toLowerCase(),
                password,
              })
            : await apiClient.register({
                email: email.trim().toLowerCase(),
                password,
                name: name.trim(),
              });

        const nextUser: UserProfile = {
          ...authData.user,
          id: authData.user.id ?? authData.user.userId ?? "",
        };

        setTokens(authData.tokens);
        setUser(nextUser);
        writeStoredTokens(authData.tokens);
        writeStoredUser(nextUser);

        setName("");
        setEmail("");
        setPassword("");
      } catch (error) {
        setAuthError(getErrorMessage(error));
      } finally {
        setIsAuthLoading(false);
      }
    },
    [email, password, authMode, name]
  );

  const handleLogout = useCallback(async () => {
    if (tokens) {
      try {
        await apiClient.logout(tokens.accessToken);
      } catch {
        // no-op
      }
    }
    clearSession();
  }, [tokens, clearSession]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      await runWithSession((accessToken) => apiClient.deleteAccount(accessToken));
      toast.success("Account deleted successfully");
      clearSession();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [runWithSession, clearSession]);

  const handleChangePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await runWithSession((accessToken) =>
        apiClient.changePassword(currentPassword, newPassword, accessToken)
      );
    },
    [runWithSession]
  );

  const handleSaveSystemInstructions = useCallback(
    async (instructions: string) => {
      const data = await runWithSession((accessToken) =>
        apiClient.updatePreferences(instructions, accessToken)
      );
      setUser((current) => {
        const updatedUser = {
          ...current,
          ...data.user,
          id: data.user.id ?? data.user.userId ?? current?.id ?? current?.userId ?? "",
        };
        writeStoredUser(updatedUser);
        return updatedUser;
      });
    },
    [runWithSession]
  );

  return {
    hydrated,
    tokens,
    user,
    setUser,
    authMode,
    setAuthMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    authError,
    setAuthError,
    isAuthLoading,
    clearSession,
    refreshAccess,
    runWithSession,
    handleAuthSubmit,
    handleLogout,
    handleDeleteAccount,
    handleChangePassword,
    handleSaveSystemInstructions,
  };
}
