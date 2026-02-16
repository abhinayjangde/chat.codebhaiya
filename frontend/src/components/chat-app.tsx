"use client";

import { useRouter } from "next/navigation";

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
  ArrowUp,
  AtSign,
  Bot,
  Copy,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SendHorizontal,
  Share,
  Square,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
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

  const router = useRouter();

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

  useEffect(() => {
    if (hydrated && !tokens) {
      router.replace("/login");
    }
  }, [hydrated, tokens, router]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#212121]">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#2a2a2a] px-4 py-2 text-sm text-[#b8b8b8]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to login...
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
                  <div className="rounded-2xl border border-white/12 bg-[#303030] px-4 pb-2.5 pt-3">
                    <textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="Ask anything..."
                      rows={1}
                      disabled={isSending || isBootstrapping}
                      className="w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-[#ececec] outline-none placeholder:text-[#7a7a7a]"
                    />

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-[#888] transition hover:bg-white/10 hover:text-[#ccc]"
                        aria-label="Attach"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-[#888] transition hover:bg-white/10 hover:text-[#ccc]">
                          Model <span className="text-[10px]">▾</span>
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#888] transition hover:bg-white/10 hover:text-[#ccc]"
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#555] text-white transition hover:bg-[#666] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Send"
                        >
                          <ArrowUp className="h-4 w-4" />
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
                      className={cn(
                        "flex",
                        isUser ? "justify-end" : "justify-start"
                      )}
                    >
                      {isUser ? (
                        /* ── User bubble: dark-blue pill, right-aligned ── */
                        <div className="max-w-[80%]">
                          <div className="rounded-full bg-[#1a3a5c] px-5 py-2.5 text-[15px] leading-6 text-[#e8e8e8]">
                            {message.content}
                          </div>
                          <p className="mt-1 text-right text-[11px] text-[#666]">
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      ) : (
                        /* ── AI response: no bubble, full-width text ── */
                        <div className="w-full max-w-none">
                          <p className="whitespace-pre-wrap text-[15px] leading-8 text-[#e0e0e0]">
                            {message.content || (message.isStreaming ? "Thinking..." : "")}
                          </p>

                          {message.sources && message.sources.length > 0 ? (
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

                          {message.usedTools && message.usedTools.length > 0 ? (
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

                          {/* Action bar */}
                          {!message.isStreaming && message.content ? (
                            <div className="mt-4 flex items-center gap-1">
                              <p className="mr-2 text-[11px] text-[#666]">
                                {formatTime(message.createdAt)}
                              </p>
                              {[
                                { icon: Copy, label: "Copy" },
                                { icon: ThumbsUp, label: "Like" },
                                { icon: ThumbsDown, label: "Dislike" },
                                { icon: Share, label: "Share" },
                                { icon: RefreshCw, label: "Regenerate" },
                                { icon: MoreHorizontal, label: "More" },
                              ].map((action) => (
                                <button
                                  key={action.label}
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#777] transition hover:bg-white/8 hover:text-[#bbb]"
                                  aria-label={action.label}
                                  onClick={() => {
                                    if (action.label === "Copy" && message.content) {
                                      void navigator.clipboard.writeText(message.content);
                                    }
                                  }}
                                >
                                  <action.icon className="h-4 w-4" />
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
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
        <footer className="bg-[#212121] px-3 py-3 md:px-6">
          <form className="mx-auto w-full max-w-3xl" onSubmit={handleComposerSubmit}>
            <div className="rounded-2xl border border-white/12 bg-[#303030] px-4 pb-2.5 pt-3">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ask a follow-up"
                rows={1}
                disabled={isSending || isBootstrapping}
                className="w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-[#ececec] outline-none placeholder:text-[#7a7a7a]"
              />

              <div className="mt-2 flex items-center justify-between">
                {/* Left — attach */}
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-[#888] transition hover:bg-white/10 hover:text-[#ccc]"
                  aria-label="Attach"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Right — model, mic, send/stop */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-[#888] transition hover:bg-white/10 hover:text-[#ccc]">
                    Model <span className="text-[10px]">▾</span>
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#888] transition hover:bg-white/10 hover:text-[#ccc]"
                    aria-label="Voice input"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  </button>
                  {isSending ? (
                    <button
                      type="button"
                      onClick={handleStopStreaming}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5a2a2a] text-[#f0d3d3] transition hover:bg-[#683232]"
                      aria-label="Stop"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isBootstrapping || !composer.trim()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#555] text-white transition hover:bg-[#666] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Send"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </footer>
        )}
      </div>
    </div>
  );
}

