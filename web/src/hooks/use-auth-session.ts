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
  const [pendingRecovery, setPendingRecovery] = useState<{
    email: string;
    password: string;
    deletionScheduledAt?: string;
  } | null>(null);

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
      setPendingRecovery(null);

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
        if (
          error instanceof ApiError &&
          error.status === 403 &&
          (error.details as Record<string, unknown> | undefined)?.code ===
            "ACCOUNT_PENDING_DELETION"
        ) {
          const details = error.details as Record<string, unknown>;
          setPendingRecovery({
            email: email.trim().toLowerCase(),
            password,
            deletionScheduledAt: details.deletionScheduledAt as string | undefined,
          });
          setAuthError(
            (details.error as string) ||
              "Your account is scheduled for deletion. You can recover it within 30 days."
          );
        } else {
          setAuthError(getErrorMessage(error));
        }
      } finally {
        setIsAuthLoading(false);
      }
    },
    [email, password, authMode, name]
  );

  const handleRecoverAccount = useCallback(
    async (overrideEmail?: string, overridePassword?: string) => {
      const targetEmail = (
        overrideEmail ??
        pendingRecovery?.email ??
        email
      )
        .trim()
        .toLowerCase();
      const targetPassword =
        overridePassword ?? pendingRecovery?.password ?? password;

      if (!targetEmail || !targetPassword) {
        setAuthError("Email and password are required to recover account.");
        return;
      }

      setIsAuthLoading(true);
      setAuthError(null);

      try {
        const authData = await apiClient.recoverAccount({
          email: targetEmail,
          password: targetPassword,
        });

        const nextUser: UserProfile = {
          ...authData.user,
          id: authData.user.id ?? authData.user.userId ?? "",
        };

        setTokens(authData.tokens);
        setUser(nextUser);
        writeStoredTokens(authData.tokens);
        writeStoredUser(nextUser);

        setPendingRecovery(null);
        setName("");
        setEmail("");
        setPassword("");
        toast.success("Welcome back! Your account has been recovered.");
      } catch (error) {
        setAuthError(getErrorMessage(error));
      } finally {
        setIsAuthLoading(false);
      }
    },
    [pendingRecovery, email, password]
  );

  const dismissRecovery = useCallback(() => {
    setPendingRecovery(null);
  }, []);

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

  const handleDeleteAccount = useCallback(
    async (confirmationText: string = "confirm") => {
      try {
        const result = await runWithSession((accessToken) =>
          apiClient.deleteAccount(accessToken, confirmationText)
        );
        toast.success(
          result?.message ||
            "Account scheduled for deletion. You have 30 days to recover your account."
        );
        clearSession();
        router.replace("/login");
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [runWithSession, clearSession, router]
  );

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
    pendingRecovery,
    handleRecoverAccount,
    dismissRecovery,
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
