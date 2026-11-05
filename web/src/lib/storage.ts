import type { AuthTokens, UserProfile } from "@/lib/types";

const USER_KEY = "chat.codebhaiya.user";
const LEGACY_TOKENS_KEY = "chat.codebhaiya.tokens";
let memoryTokens: AuthTokens | null = null;

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
  clearLegacyStoredTokens();
  return memoryTokens;
}

export function readStoredUser(): UserProfile | null {
  return safeRead<UserProfile>(USER_KEY);
}

export function writeStoredTokens(tokens: AuthTokens): void {
  memoryTokens = { accessToken: tokens.accessToken };
}

export function writeStoredUser(user: UserProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  memoryTokens = null;
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LEGACY_TOKENS_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function clearLegacyStoredTokens(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_TOKENS_KEY);
  }
}
