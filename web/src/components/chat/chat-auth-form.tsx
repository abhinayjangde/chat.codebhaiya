"use client";

import { AlertTriangle, Clock, Loader2, RotateCcw } from "lucide-react";
import { type FormEvent, memo } from "react";

interface ChatAuthFormProps {
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  isAuthLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pendingRecovery?: {
    email: string;
    password: string;
    deletionScheduledAt?: string;
  } | null;
  onRecover?: () => void;
  onDismissRecovery?: () => void;
}

export const ChatAuthForm = memo(function ChatAuthForm({
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
  onSubmit,
  pendingRecovery,
  onRecover,
  onDismissRecovery,
}: ChatAuthFormProps) {
  const formattedScheduledDate = pendingRecovery?.deletionScheduledAt
    ? new Date(pendingRecovery.deletionScheduledAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "within 30 days";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--chat-bg) p-4 text-(--chat-text)">
      <div className="w-full max-w-sm rounded-2xl border border-(--chat-composer-border) bg-(--chat-surface) p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-semibold">Welcome Back</h1>
          <p className="text-sm text-(--chat-text-secondary)">
            {authMode === "login" ? "Sign in to continue" : "Create an account"}
          </p>
        </div>

        {/* 30-Day Recovery Notice Card */}
        {pendingRecovery && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-amber-300 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Account Pending Deletion</span>
            </div>
            <p className="leading-relaxed text-amber-200/90">
              This account is deactivated and scheduled for permanent deletion on{" "}
              <strong className="text-white font-medium">{formattedScheduledDate}</strong>.
            </p>
            <p className="text-xs text-amber-300">
              You can cancel deletion and recover your account right now.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onRecover}
                disabled={isAuthLoading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
              >
                {isAuthLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Recover Account
              </button>
              {onDismissRecovery && (
                <button
                  type="button"
                  onClick={onDismissRecovery}
                  disabled={isAuthLoading}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        {authError && !pendingRecovery && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {authMode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-(--chat-text-secondary)">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-(--chat-composer-border) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--chat-label)"
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-(--chat-text-secondary)">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-(--chat-composer-border) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--chat-label)"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-(--chat-text-secondary)">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-(--chat-composer-border) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--chat-label)"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isAuthLoading}
            className="mt-2 w-full rounded-lg bg-(--chat-send-bg) py-2.5 text-sm font-medium text-white transition hover:bg-(--chat-send-bg-hover) disabled:opacity-50"
          >
            {isAuthLoading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : authMode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            type="button"
            className="text-(--chat-text-secondary) hover:text-(--chat-text) hover:underline"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthError(null);
              if (onDismissRecovery) onDismissRecovery();
            }}
          >
            {authMode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
});
