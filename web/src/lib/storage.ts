import type { AuthTokens, UserProfile } from "@/lib/types";

const TOKENS_KEY = "chat.codebhaiya.tokens";
const USER_KEY = "chat.codebhaiya.user";

function safeRead<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readStoredTokens(): AuthTokens | null {
  return safeRead<AuthTokens>(TOKENS_KEY);
}

export function readStoredUser(): UserProfile | null {
  return safeRead<UserProfile>(USER_KEY);
}

export function writeStoredTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function writeStoredUser(user: UserProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKENS_KEY);
  window.localStorage.removeItem(USER_KEY);
}
