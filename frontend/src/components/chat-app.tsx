"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AtSign,
  Bot,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  SendHorizontal,
  Square,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { ApiError, apiClient } from "@/lib/api";
import {
  clearStoredSession,
  readStoredTokens,
  readStoredUser,
  writeStoredTokens,
  writeStoredUser,
} from "@/lib/storage";
import type {
  AuthTokens,
  ChatMessage,
  ChatSummary,
  MessageSource,
  StreamEvent,
  UsedTool,
  UserProfile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Summarize the latest AI safety trends with citations.",
  "Draft a product launch plan for a developer tool.",
  "Compare GPT and open-source LLM deployment options.",
  "Explain this week in tech as a short morning briefing.",
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("abort");
  }

  return false;
}

function normalizeSource(source: MessageSource): MessageSource {
  if (source.url || !source.link) {
    return source;
  }
  return { ...source, url: source.link };
}

function mergeSources(
  existing: MessageSource[] | undefined,
  incoming: MessageSource[]
): MessageSource[] {
  const byKey = new Map<string, MessageSource>();

  for (const source of [...(existing ?? []), ...incoming].map(normalizeSource)) {
    const key = `${source.url ?? source.link ?? ""}-${source.title}-${source.position ?? ""}`;
    byKey.set(key, source);
  }

  return Array.from(byKey.values());
}

function mergeUsedTools(existing: UsedTool[] | undefined, incoming: UsedTool): UsedTool[] {
  const tools = [...(existing ?? [])];
  const key = `${incoming.name}-${JSON.stringify(incoming.input ?? null)}`;
  const index = tools.findIndex((tool) => {
    const currentKey = `${tool.name}-${JSON.stringify(tool.input ?? null)}`;
    return currentKey === key;
  });

  if (index === -1) {
    tools.push(incoming);
    return tools;
  }

  tools[index] = { ...tools[index], ...incoming };
  return tools;
}

function formatDateLabel(value?: string): string {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.round(diffMs / minute));
    return `${mins}m ago`;
  }

  if (diffMs < day) {
    const hrs = Math.max(1, Math.round(diffMs / hour));
    return `${hrs}h ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(value?: string): string {
  if (!value) {
    return "now";
  }

  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseStreamChunk(
  chunk: string,
  onEvent: (event: StreamEvent) => void
): void {
  const lines = chunk.split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload) {
      continue;
    }

    try {
      const parsed = JSON.parse(payload) as StreamEvent;
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        onEvent(parsed);
      }
    } catch {
      continue;
    }
  }
}

async function consumeSseStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      parseStreamChunk(chunk, onEvent);
    }
  }

  if (buffer.trim()) {
    parseStreamChunk(buffer, onEvent);
  }
}

function shortTitle(title: string): string {
  if (title.length <= 52) {
    return title;
  }
  return `${title.slice(0, 52)}...`;
}

function formatSourceHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export function ChatApp() {
  const [hydrated, setHydrated] = useState(false);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const streamAbortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const clearSession = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    clearStoredSession();
    setTokens(null);
    setUser(null);
    setChats([]);
    setMessages([]);
    setActiveChatId(null);
    setChatError(null);
    setMobileSidebarOpen(false);
    setIsSending(false);
    setIsLoadingMessages(false);
    setIsLoadingChats(false);
    setIsBootstrapping(false);
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
        throw new Error("Please sign in to continue.");
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
          throw new Error("Session expired. Please sign in again.");
        }

        return operation(refreshed.accessToken);
      }
    },
    [tokens, refreshAccess]
  );

  const loadChats = useCallback(async () => {
    if (!tokens) {
      return;
    }

    setIsLoadingChats(true);
    setChatError(null);

    try {
      const data = await runWithSession((accessToken) =>
        apiClient.listChats(accessToken)
      );
      const ordered = [...data.chats].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setChats(ordered);
      setActiveChatId((current) => {
        if (current && ordered.some((chat) => chat._id === current)) {
          return current;
        }
        return ordered[0]?._id ?? null;
      });
    } catch (error) {
      setChatError(getErrorMessage(error));
    } finally {
      setIsLoadingChats(false);
    }
  }, [tokens, runWithSession]);

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
    if (!tokens) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setChatError(null);

      try {
        const meData = await runWithSession((accessToken) =>
          apiClient.me(accessToken)
        );
        if (cancelled) {
          return;
        }

        setUser((current) => {
          const mergedUser: UserProfile = {
            ...current,
            ...meData.user,
            id:
              meData.user.id ??
              meData.user.userId ??
              current?.id ??
              current?.userId ??
              "",
          };
          writeStoredUser(mergedUser);
          return mergedUser;
        });
        await loadChats();
      } catch (error) {
        if (!cancelled) {
          setChatError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [tokens, runWithSession, loadChats]);

  useEffect(() => {
    if (!tokens || !activeChatId || isSending) {
      if (!activeChatId) {
        setMessages([]);
      }
      return;
    }

    let cancelled = false;
    setIsLoadingMessages(true);
    setChatError(null);

    void runWithSession((accessToken) =>
      apiClient.listMessages(activeChatId, accessToken)
    )
      .then((data) => {
        if (cancelled) {
          return;
        }

        const normalized = data.messages.map((message) => ({
          ...message,
          content: message.content ?? "",
          sources: message.sources?.map(normalizeSource),
        }));

        setMessages(normalized);
      })
      .catch((error) => {
        if (!cancelled) {
          setChatError(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tokens, activeChatId, runWithSession, isSending]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat._id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      setComposer("");
      setMessages([]);
      setChats([]);
      setActiveChatId(null);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (tokens) {
      try {
        await apiClient.logout(tokens.accessToken);
      } catch {
        // no-op: client-side session is still cleared
      }
    }
    clearSession();
  };

  const handleSendPrompt = async (promptOverride?: string) => {
    if (!tokens || isSending) {
      return;
    }

    const prompt = (promptOverride ?? composer).trim();
    if (!prompt) {
      return;
    }

    setComposer("");
    setChatError(null);
    setIsSending(true);
    setMobileSidebarOpen(false);

    let targetChatId = activeChatId;
    const nowIso = new Date().toISOString();
    const userMessageId = `local-user-${Date.now()}`;
    const assistantMessageId = `local-assistant-${Date.now()}`;

    try {
      if (!targetChatId) {
        const created = await runWithSession((accessToken) =>
          apiClient.createChat(prompt, accessToken)
        );
        targetChatId = String(created.chatId);

        const provisionalChat: ChatSummary = {
          _id: targetChatId,
          userId: user?.id ?? user?.userId ?? "",
          title: created.title,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        setChats((previous) => [provisionalChat, ...previous]);
        setActiveChatId(targetChatId);
        setMessages([]);
      }

      if (!targetChatId) {
        throw new Error("Unable to create a new chat right now.");
      }

      const readyChatId = targetChatId;

      setChats((previous) => {
        const existing = previous.filter((chat) => chat._id !== readyChatId);
        const current = previous.find((chat) => chat._id === readyChatId);
        const updated: ChatSummary = {
          _id: readyChatId,
          userId: current?.userId ?? user?.id ?? user?.userId ?? "",
          title: prompt,
          createdAt: current?.createdAt ?? nowIso,
          updatedAt: nowIso,
        };
        return [updated, ...existing];
      });

      const userMessage: ChatMessage = {
        _id: userMessageId,
        role: "user",
        content: prompt,
        createdAt: nowIso,
      };

      const assistantMessage: ChatMessage = {
        _id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: nowIso,
        sources: [],
        usedTools: [],
        isStreaming: true,
      };

      setMessages((previous) => [...previous, userMessage, assistantMessage]);

      const controller = new AbortController();
      streamAbortRef.current = controller;

      const stream = await runWithSession((accessToken) =>
        apiClient.streamMessage(readyChatId, prompt, accessToken, controller.signal)
      );

      await consumeSseStream(stream, (event) => {
        if (event.type === "error") {
          throw new Error(event.error);
        }

        if (event.type === "token") {
          setMessages((previous) =>
            previous.map((message) =>
              message._id === assistantMessageId
                ? {
                    ...message,
                    content: `${message.content}${event.content}`,
                  }
                : message
            )
          );
          return;
        }

        if (event.type === "sources") {
          setMessages((previous) =>
            previous.map((message) =>
              message._id === assistantMessageId
                ? {
                    ...message,
                    sources: mergeSources(message.sources, event.sources),
                  }
                : message
            )
          );
          return;
        }

        if (event.type === "tool_start") {
          setMessages((previous) =>
            previous.map((message) =>
              message._id === assistantMessageId
                ? {
                    ...message,
                    usedTools: mergeUsedTools(message.usedTools, {
                      name: event.tool,
                    }),
                  }
                : message
            )
          );
          return;
        }

        if (event.type === "tool_result") {
          setMessages((previous) =>
            previous.map((message) =>
              message._id === assistantMessageId
                ? {
                    ...message,
                    usedTools: mergeUsedTools(message.usedTools, {
                      name: event.tool,
                      output: event.output,
                    }),
                  }
                : message
            )
          );
          return;
        }

        if (event.type === "done") {
          setMessages((previous) =>
            previous.map((message) =>
              message._id === assistantMessageId
                ? {
                    ...message,
                    sources: event.sources
                      ? mergeSources(message.sources, event.sources)
                      : message.sources,
                    usedTools: event.usedTools
                      ? event.usedTools.reduce(
                          (acc, tool) => mergeUsedTools(acc, tool),
                          message.usedTools
                        )
                      : message.usedTools,
                    isStreaming: false,
                  }
                : message
            )
          );
        }
      });

      setMessages((previous) =>
        previous.map((message) =>
          message._id === assistantMessageId
            ? {
                ...message,
                isStreaming: false,
                content:
                  message.content.trim() ||
                  "I could not generate a response for that prompt.",
              }
            : message
        )
      );

      await loadChats();
    } catch (error) {
      if (isAbortError(error)) {
        setMessages((previous) =>
          previous.map((entry) =>
            entry._id === assistantMessageId
              ? {
                  ...entry,
                  isStreaming: false,
                  content: entry.content.trim() || "Generation stopped.",
                }
              : entry
          )
        );
        return;
      }

      const message = getErrorMessage(error);
      setChatError(message);

      setMessages((previous) =>
        previous.map((entry) =>
          entry._id === assistantMessageId
            ? {
                ...entry,
                isStreaming: false,
                content: entry.content.trim() || `Request failed: ${message}`,
              }
            : entry
        )
      );
    } finally {
      streamAbortRef.current = null;
      setIsSending(false);
    }
  };

  const handleStopStreaming = () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setIsSending(false);
    setMessages((previous) =>
      previous.map((message) =>
        message.isStreaming
          ? {
              ...message,
              isStreaming: false,
              content: message.content.trim() || "Generation stopped.",
            }
          : message
      )
    );
  };

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSendPrompt();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendPrompt();
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-card/90 px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading application...
        </div>
      </div>
    );
  }

  if (!tokens) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#212121] px-4 py-10 text-[#ececec]">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#2a2a2a] p-6 shadow-[0_24px_80px_-45px_rgba(0,0,0,0.85)]">
          <div className="mb-6 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#b7b7b7]">
              <Sparkles className="h-3.5 w-3.5" />
              Code Bhaiya AI
            </p>
            <h2 className="mt-4 text-2xl font-medium text-[#f3f3f3]">
              {authMode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="mt-2 text-sm text-[#a6a6a6]">
              {authMode === "login"
                ? "Sign in to continue your conversations."
                : "Register to start chatting."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleAuthSubmit}>
            {authMode === "register" ? (
              <label className="block space-y-1.5">
                <span className="text-sm text-[#c6c6c6]">Name</span>
                <input
                  className="h-11 w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 text-sm text-[#ececec] outline-none transition focus:border-[#7a7a7a]"
                  placeholder="Your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-sm text-[#c6c6c6]">Email</span>
              <input
                className="h-11 w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 text-sm text-[#ececec] outline-none transition focus:border-[#7a7a7a]"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm text-[#c6c6c6]">Password</span>
              <input
                className="h-11 w-full rounded-xl border border-white/15 bg-[#1f1f1f] px-3 text-sm text-[#ececec] outline-none transition focus:border-[#7a7a7a]"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
              />
            </label>

            {authError ? (
              <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {authError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f3f3f3] px-4 text-sm font-medium text-[#1f1f1f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : authMode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#a7a7a7]">
            {authMode === "login" ? "Need an account?" : "Already have one?"}{" "}
            <button
              type="button"
              className="font-medium text-[#f3f3f3] underline-offset-4 hover:underline"
              onClick={() =>
                setAuthMode((current) =>
                  current === "login" ? "register" : "login"
                )
              }
            >
              {authMode === "login" ? "Register" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#212121] text-[#ececec]">
      <div
        className={cn(
          "fixed inset-0 z-20 bg-black/60 transition md:hidden",
          mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-white/10 bg-[#171717] transition-transform md:static md:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-3 pb-2 pt-3">
          <button
            type="button"
            className="inline-flex h-10 w-full items-center justify-start gap-2 rounded-lg border border-white/10 px-3 text-sm font-medium text-[#e9e9e9] transition hover:bg-white/5"
            onClick={() => {
              setActiveChatId(null);
              setMessages([]);
              setChatError(null);
              setMobileSidebarOpen(false);
            }}
            disabled={isSending}
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          <button
            type="button"
            className="ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#bdbdbd] transition hover:bg-white/10 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="rounded-lg border border-white/10 bg-[#1f1f1f] px-3 py-2 text-xs text-[#a8a8a8]">
            GPT-style workspace
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {isLoadingChats || isBootstrapping ? (
            <div className="rounded-lg px-3 py-2 text-sm text-[#9e9e9e]">
              Loading chats...
            </div>
          ) : chats.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-[#1f1f1f] px-3 py-2 text-sm text-[#9e9e9e]">
              No conversations yet.
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat._id}
                type="button"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition",
                  chat._id === activeChatId
                    ? "border-white/20 bg-[#2a2a2a]"
                    : "border-transparent text-[#cfcfcf] hover:bg-[#242424]"
                )}
                onClick={() => {
                  setActiveChatId(chat._id);
                  setMobileSidebarOpen(false);
                }}
              >
                <p className="line-clamp-1 text-sm">{shortTitle(chat.title || "New chat")}</p>
                <p className="mt-1 text-[11px] text-[#8f8f8f]">
                  {formatDateLabel(chat.updatedAt)}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-lg border border-white/10 bg-[#1f1f1f] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8f8f]">
              Signed in
            </p>
            <p className="mt-1 truncate text-sm text-[#ececec]">
              {user?.name || user?.email || "Account"}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 text-sm text-[#d4d4d4] transition hover:bg-white/10"
            onClick={() => {
              void handleLogout();
            }}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile sidebar toggle — no header bar */}
        <button
          type="button"
          className="absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#cfcfcf] transition hover:bg-white/10 md:hidden"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </button>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
            {chatError ? (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {chatError}
              </div>
            ) : null}

            {isLoadingMessages ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#2a2a2a] px-3 py-2 text-sm text-[#b8b8b8]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center">
                {/* Brand name */}
                <h2
                  className="mb-10 text-4xl font-light tracking-wide text-[#b0b0b0]"
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                >
                  codebhaiya
                </h2>

                {/* Centered composer */}
                <form
                  className="w-full max-w-2xl"
                  onSubmit={handleComposerSubmit}
                >
                  <div className="rounded-2xl border border-white/12 bg-[#2a2a2a] p-1.5">
                    <textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="Ask anything. Type @ for sources and / for shortcuts."
                      rows={2}
                      disabled={isSending || isBootstrapping}
                      className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 text-[#ececec] outline-none placeholder:text-[#7a7a7a]"
                    />

                    <div className="flex items-center justify-between px-2 pb-1 pt-1">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#888] transition hover:bg-white/10 hover:text-[#ccc]"
                        aria-label="Attach"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#888] transition hover:bg-white/10 hover:text-[#ccc] cursor-pointer">
                          Model <span className="text-[10px]">▾</span>
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#888] transition hover:bg-white/10 hover:text-[#ccc]"
                          aria-label="Voice input"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                          </svg>
                        </button>
                        <button
                          type="submit"
                          disabled={isBootstrapping || !composer.trim()}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#444] text-white transition hover:bg-[#555] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Send"
                        >
                          <SendHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Quick action chips */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {[
                    { icon: "❤️", label: "Health" },
                    { icon: "📋", label: "Plan" },
                    { icon: "🔍", label: "Research" },
                    { icon: "📰", label: "Latest News" },
                    { icon: "📊", label: "Analyze" },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-transparent px-3.5 py-1.5 text-xs text-[#999] transition hover:border-white/20 hover:bg-white/5 hover:text-[#ccc]"
                      onClick={() => {
                        setComposer(chip.label + ": ");
                      }}
                    >
                      <span>{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={message._id ?? `${message.role}-${index}`}
                      className={cn("flex", isUser ? "justify-end" : "justify-start")}
                    >
                      <article
                        className={cn(
                          "max-w-[90%] rounded-2xl px-4 py-3",
                          isUser
                            ? "border border-white/10 bg-[#303030]"
                            : "bg-transparent"
                        )}
                      >
                        <div className="mb-2 flex items-center gap-2 text-xs text-[#9b9b9b]">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#2b2b2b]">
                            {isUser ? (
                              <UserRound className="h-3.5 w-3.5" />
                            ) : (
                              <Bot className="h-3.5 w-3.5 text-[#d8d8d8]" />
                            )}
                          </span>
                          <span>{isUser ? "You" : "Assistant"}</span>
                          <span aria-hidden="true">•</span>
                          <span>{formatTime(message.createdAt)}</span>
                        </div>

                        <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#ececec]">
                          {message.content || (message.isStreaming ? "Thinking..." : "")}
                        </p>

                        {!isUser && message.sources && message.sources.length > 0 ? (
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {message.sources.map((source, sourceIndex) => {
                              const href = source.url ?? source.link;
                              return (
                                <a
                                  key={`${source.title}-${sourceIndex}`}
                                  href={href || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-xl border border-white/10 bg-[#2a2a2a] p-3 text-xs transition hover:bg-[#333333]"
                                >
                                  <p className="font-medium text-[#f1f1f1]">
                                    {source.title || "Source"}
                                  </p>
                                  {source.snippet ? (
                                    <p className="mt-1 line-clamp-3 text-[#b4b4b4]">
                                      {source.snippet}
                                    </p>
                                  ) : null}
                                  {href ? (
                                    <p className="mt-2 inline-flex items-center gap-1 text-[#9dd3c7]">
                                      <AtSign className="h-3 w-3" />
                                      {formatSourceHost(href)}
                                    </p>
                                  ) : null}
                                </a>
                              );
                            })}
                          </div>
                        ) : null}

                        {!isUser && message.usedTools && message.usedTools.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.usedTools.map((tool, toolIndex) => (
                              <span
                                key={`${tool.name}-${toolIndex}`}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#2a2a2a] px-2.5 py-1 text-xs text-[#b4b4b4]"
                              >
                                <MessageSquareText className="h-3 w-3" />
                                {tool.name}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {message.isStreaming ? (
                          <div className="mt-3 inline-flex items-center gap-2 text-xs text-[#b3b3b3]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            generating...
                          </div>
                        ) : null}
                      </article>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Bottom composer — only shown when messages exist */}
        {messages.length > 0 && (
        <footer className="border-t border-white/10 bg-[#212121] px-3 py-3 md:px-6">
          <form className="mx-auto w-full max-w-3xl" onSubmit={handleComposerSubmit}>
            <div className="rounded-3xl border border-white/15 bg-[#2a2a2a] p-2">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Message Code Bhaiya AI..."
                rows={3}
                disabled={isSending || isBootstrapping}
                className="w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-6 text-[#ececec] outline-none placeholder:text-[#9d9d9d]"
              />

              <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 px-1 pt-2">
                <p className="text-xs text-[#a8a8a8]">
                  {isSending
                    ? "Receiving live stream from backend..."
                    : "Enter to send, Shift+Enter for new line."}
                </p>
                {isSending ? (
                  <button
                    type="button"
                    onClick={handleStopStreaming}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#5a2a2a] px-3 text-sm font-medium text-[#f0d3d3] transition hover:bg-[#683232]"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isBootstrapping || !composer.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#10a37f] px-3 text-sm font-medium text-white transition hover:bg-[#0f8f70] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Send
                  </button>
                )}
              </div>
            </div>
          </form>
        </footer>
        )}
      </div>
    </div>
  );
}

