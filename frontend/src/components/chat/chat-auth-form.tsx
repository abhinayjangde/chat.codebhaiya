
"use client";

import { Loader2 } from "lucide-react";
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
}: ChatAuthFormProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--chat-bg) p-4 text-(--chat-text)">
      <div className="w-full max-w-sm rounded-2xl border border-(--chat-composer-border) bg-(--chat-surface) p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-semibold">Welcome Back</h1>
          <p className="text-sm text-(--chat-text-secondary)">
            {authMode === "login" ? "Sign in to continue" : "Create an account"}
          </p>
        </div>

        {authError && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {authError}
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
