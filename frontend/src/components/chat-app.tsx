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
  Sun,
  Moon,
  Monitor,
  AtSign,
  Bot,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  PanelLeft,
  Plus,
  RefreshCw,
  Search,
  SendHorizontal,
  Settings,
  Share,
  Trash2,
  Shield,
  Square,
  Sparkles,
  SquarePen,
  SunMoon,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Users,
  X,
  Paperclip,
  Cloud,
  Telescope,
  Gavel,
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
  ModelInfo,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FcGoogle } from "react-icons/fc";
import { SiMeta, SiOpenai } from "react-icons/si";
import { useTheme } from "next-themes";
import Link from "next/link";

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

function ModelLogo({ provider, className = "h-4 w-4" }: { provider: string; className?: string }) {
  switch (provider) {
    case "groq":
      return <SiMeta className={className} />;
    case "google":
      return <FcGoogle className={className} />;
    case "openai":
      return <SiOpenai className={className} />;
    case "ollama":
      return <span className={className} style={{ fontSize: "inherit", lineHeight: 1 }}>🦙</span>;
    default:
      return <Bot className={className} />;
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

  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false);
  const [chatMenuOpenId, setChatMenuOpenId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter((c) => c.title?.toLowerCase().includes(q));
  }, [chats, searchQuery]);

  const streamAbortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const skipNextFetchRef = useRef(false);
  const isSendingRef = useRef(false);

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
    // Fetch available models on mount
    apiClient.listModels().then((data) => {
      setAvailableModels(data.models);
      setSelectedModel(data.default);
    }).catch(console.error);
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
    if (!tokens || !activeChatId) {
      if (!activeChatId) {
        setMessages([]);
      }
      return;
    }

    // Skip fetch if we're currently sending or if we just finished streaming
    // (messages are already up-to-date from the stream)
    if (isSendingRef.current) {
      return;
    }

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
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
  }, [tokens, activeChatId, runWithSession]);

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
    isSendingRef.current = true;
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
        skipNextFetchRef.current = true;
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
        apiClient.streamMessage(
          readyChatId, 
          prompt, 
          accessToken, 
          controller.signal,
          selectedModel // Pass selected model
        )
      );

      await consumeSseStream(stream, (event) => {
        if (event.type === "error") {
          throw new Error(event.error);
        }

        if (event.type === "token") {
          setMessages((previous) =>
            previous.map((message) => {
              if (message._id !== assistantMessageId) return message;
              let newContent = `${message.content}${event.content}`;
              // Strip user prompt if backend echoes it at the start
              if (newContent.startsWith(prompt)) {
                newContent = newContent.slice(prompt.length);
              }
              return { ...message, content: newContent };
            })
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
      skipNextFetchRef.current = true;
      isSendingRef.current = false;
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

  const handleDeleteChat = async (chatId: string) => {
    setChatMenuOpenId(null);
    try {
      await runWithSession((accessToken) =>
        apiClient.deleteChat(chatId, accessToken)
      );
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
        setChatError(null);
      }
    } catch (error) {
      setChatError(getErrorMessage(error));
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
      <div className="flex min-h-screen items-center justify-center bg-(--chat-bg)">
        <div className="inline-flex items-center gap-3 rounded-full border border-(--chat-dropdown-border) bg-(--chat-surface) px-4 py-2 text-sm text-(--chat-loading)">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to login...
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-(--chat-bg) text-(--chat-text)">
      <div
        className={cn(
          "fixed inset-0 z-20 bg-(--chat-overlay) transition md:hidden",
          mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col bg-(--chat-sidebar) transition-all duration-300 ease-in-out md:static",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarOpen ? "md:translate-x-0 md:w-[260px] md:opacity-100" : "md:-translate-x-full md:w-0 md:opacity-0 md:overflow-hidden"
        )}
      >
        {/* ── Top bar: logo + new-chat icon ── */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-(--chat-text) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer"
            onClick={() => {
              setActiveChatId(null);
              setMessages([]);
              setChatError(null);
              setMobileSidebarOpen(false);
            }}
            aria-label="Home"
          >
            <Image
            src="https://avatars.githubusercontent.com/u/166032907?v=4"
            alt="Logo"
            className="size-6 rounded-full"
            width={100}
            height={100}
          />
          </button>
          <span className="ml-0 text-lg font-semibold">codebhaiya.ai</span>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-(--chat-text-muted) transition hover:bg-(--chat-sidebar-text-hover) hover:text-(--chat-text) hover:cursor-pointer"
            onClick={() => {
              setSidebarOpen(false);
              setMobileSidebarOpen(false);
            }}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* ── Navigation links ── */}
        <nav className="mt-2 flex flex-col gap-0.5 px-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer"
            onClick={() => {
              setActiveChatId(null);
              setMessages([]);
              setChatError(null);
              setMobileSidebarOpen(false);
            }}
            disabled={isSending}
          >
            <Plus className="h-[18px] w-[18px] text-(--chat-text-muted)" />
            New chat
          </button>
          {searchOpen ? (
            <div className="flex items-center gap-2 rounded-lg bg-(--chat-sidebar-active) px-3 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-(--chat-text-muted)" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search chats…"
                autoFocus
                className="w-full bg-transparent text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint)"
              />
              <button
                type="button"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-(--chat-text-muted) transition hover:text-(--chat-text)"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                aria-label="Close search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-[18px] w-[18px] text-(--chat-text-muted)" />
              Search chats
            </button>
          )}
        </nav>

        {/* ── Your chats section ── */}
        <div className="mt-5 flex flex-col flex-1 min-h-0">
          <p className="px-4 pb-2 text-[11px] font-medium text-(--chat-label)">
            Your chats
          </p>
          <div className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-3">
            {isLoadingChats || isBootstrapping ? (
              <div className="px-3 py-2 text-sm text-(--chat-text-faint)">
                Loading chats…
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="px-3 py-2 text-sm text-(--chat-text-faint)">
                {searchQuery.trim() ? "No matching chats." : "No conversations yet."}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredChats.map((chat) => (
                  <div key={chat._id} className="group relative">
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-lg px-3 py-2 pr-8 text-left text-sm transition hover:cursor-pointer",
                        chat._id === activeChatId
                          ? "bg-(--chat-sidebar-active) text-(--chat-text)"
                          : "text-(--chat-text-secondary) hover:bg-(--chat-sidebar-hover)"
                      )}
                      onClick={() => {
                        setActiveChatId(chat._id);
                        setMobileSidebarOpen(false);
                      }}
                    >
                      <p className="truncate">{shortTitle(chat.title || "New chat")}</p>
                    </button>

                    {/* ⋯ menu trigger */}
                    <button
                      type="button"
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-(--chat-text-muted) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)",
                        chatMenuOpenId === chat._id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatMenuOpenId(chatMenuOpenId === chat._id ? null : chat._id);
                      }}
                      aria-label="Chat options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {/* Dropdown menu */}
                    {chatMenuOpenId === chat._id && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setChatMenuOpenId(null)}
                        />
                        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl">
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) opacity-50 cursor-not-allowed"
                            disabled
                          >
                            <Share className="h-4 w-4 text-(--chat-label)" />
                            Share
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) opacity-50 cursor-not-allowed"
                            disabled
                          >
                            <SquarePen className="h-4 w-4 text-(--chat-label)" />
                            Rename
                          </button>
                          <div className="my-1 border-t border-(--chat-dropdown-border)" />
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                            onClick={() => void handleDeleteChat(chat._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom section ── */}
        <div className="mt-auto flex flex-col gap-0.5 px-2 pb-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-sidebar-text-hover)"
          >
            <ExternalLink className="h-[18px] w-[18px] text-(--chat-label)" />
            <Link href="https://www.codebhaiya.com" target="_blank" rel="noopener noreferrer" >codebhaiya.com</Link>
          </button>

          {/* Settings with popup */}
          <div className="relative">
            {settingsMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSettingsMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 z-50 mb-1 w-56 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl">
                  {/* Top group - Theme with hover submenu */}
                  <div
                    className="relative"
                    onMouseEnter={() => setThemeSubmenuOpen(true)}
                    onMouseLeave={() => setThemeSubmenuOpen(false)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                    >
                      <span className="flex items-center gap-3">
                        <SunMoon className="h-[18px] w-[18px] text-(--chat-label)" />
                        Theme
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#666]" />
                    </button>

                    {/* Theme submenu */}
                    {themeSubmenuOpen && (
                      <div className="absolute left-full top-0 z-[60] ml-1 w-40 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl">
                        {[
                          { id: "light", label: "Light", icon: Sun },
                          { id: "dark", label: "Dark", icon: Moon },
                          { id: "system", label: "System", icon: Monitor },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                            onClick={() => {
                              setTheme(opt.id);
                              setThemeSubmenuOpen(false);
                              setSettingsMenuOpen(false);
                            }}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full border ${
                                theme === opt.id
                                  ? "border-white bg-white"
                                  : "border-[#666] bg-transparent"
                              }`}
                            />
                            <opt.icon className="h-[16px] w-[16px] text-(--chat-label)" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setSettingsMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <CreditCard className="h-[18px] w-[18px] text-(--chat-label)" />
                      Submit prompt key
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#666]" />
                  </button>

                  {/* Divider */}
                  <div className="my-1.5 border-t border-(--chat-dropdown-border)" />

                  {/* Middle group */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setSettingsMenuOpen(false)}
                  >
                    <Users className="h-[18px] w-[18px] text-(--chat-label)" />
                    View status
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setSettingsMenuOpen(false)}
                  >
                    <FileText className="h-[18px] w-[18px] text-(--chat-label)" />
                    Terms of service
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setSettingsMenuOpen(false)}
                  >
                    <Shield className="h-[18px] w-[18px] text-(--chat-label)" />
                    Privacy policy
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setSettingsMenuOpen(false)}
                  >
                    <MessageCircle className="h-[18px] w-[18px] text-(--chat-label)" />
                    Send feedback
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setSettingsMenuOpen(false)}
                  >
                    <CreditCard className="h-[18px] w-[18px] text-(--chat-label)" />
                    Billing Support
                  </button>

                  {/* Divider */}
                  <div className="my-1.5 border-t border-(--chat-dropdown-border)" />

                  {/* Logout */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-logout-text) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      void handleLogout();
                    }}
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                    Log out
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-sidebar-text-hover)",
                settingsMenuOpen && "bg-white/5"
              )}
              onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            >
              <Settings className="h-[18px] w-[18px] text-(--chat-label)" />
              Settings
            </button>
          </div>

          {/* User row */}
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-(--chat-sidebar-text-hover)"
          >
            <Image
              src="https://avatars.githubusercontent.com/u/166032907?v=4"
              alt="Avatar"
              className="h-7 w-7 shrink-0 rounded-full"
              width={28}
              height={28}
            />
            <span className="truncate text-sm text-(--chat-text-secondary)">
              {user?.email || user?.name || "Account"}
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sidebar toggle — visible when sidebar is closed (desktop) or always on mobile */}
        {(!sidebarOpen || true) && (
          <button
            type="button"
            className={cn(
              "absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-(--chat-text-secondary) transition hover:bg-(--chat-sidebar-text-hover)",
              sidebarOpen ? "md:hidden" : ""
            )}
            onClick={() => {
              setSidebarOpen(true);
              setMobileSidebarOpen(true);
            }}
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
            {chatError ? (
              <div className="mb-4 rounded-lg border border-(--chat-error-border) bg-(--chat-error-bg) px-3 py-2 text-sm text-(--chat-error-text)">
                {chatError}
              </div>
            ) : null}

            {isLoadingMessages ? (
              <div className="flex items-center gap-2 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-3 py-2 text-sm text-(--chat-loading)">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center">
                {/* Brand name */}
                <h2
                  className="mb-10 text-4xl font-light tracking-wide text-(--chat-brand)"
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                >
                  codebhaiya
                </h2>

                {/* Centered composer */}
                <form
                  className="w-full max-w-2xl"
                  onSubmit={handleComposerSubmit}
                >
                  <div className="rounded-2xl border border-(--chat-composer-border) bg-(--chat-composer) px-4 pb-2.5 pt-3">
                    <textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="Ask anything..."
                      rows={1}
                      disabled={isSending || isBootstrapping}
                      className="w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-(--chat-input-text) outline-none placeholder:text-(--chat-input-placeholder)"
                    />

                    <div className="mt-2 flex items-center justify-between">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full border border-(--chat-composer-border) text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
                            plusMenuOpen && "bg-(--chat-dropdown-hover) text-(--chat-action-icon-hover)"
                          )}
                          aria-label="Attach"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        {/* Plus Menu Popup */}
                        {plusMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setPlusMenuOpen(false)}
                            />
                            <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl z-50">
                              {/* Upload files */}
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                                onClick={() => setPlusMenuOpen(false)}
                              >
                                <Paperclip className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                                Upload files or images
                              </button>

                              {/* Cloud */}
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                                onClick={() => setPlusMenuOpen(false)}
                              >
                                <span className="flex items-center gap-3">
                                  <Cloud className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                                  Add files from cloud
                                </span>
                                <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                              </button>

                              <div className="my-1 border-t border-(--chat-dropdown-border)" />

                              {/* Deep research */}
                              <button
                                type="button"
                                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-(--chat-dropdown-hover)"
                                onClick={() => setPlusMenuOpen(false)}
                              >
                                <Telescope className="mt-0.5 h-[18px] w-[18px] text-(--chat-text-secondary)" />
                                <div>
                                  <div className="text-sm font-medium text-(--chat-text)">Deep research</div>
                                  <div className="text-xs text-(--chat-text-muted)">In-depth reports and analysis</div>
                                </div>
                              </button>

                              {/* Model council */}
                              <button
                                type="button"
                                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-(--chat-dropdown-hover)"
                                onClick={() => setPlusMenuOpen(false)}
                              >
                                <Gavel className="mt-0.5 h-[18px] w-[18px] text-(--chat-text-secondary)" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-(--chat-text)">Model council</span>
                                    <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                                      Max
                                    </span>
                                  </div>
                                  <div className="text-xs text-(--chat-text-muted)">Multiple AI models at once</div>
                                </div>
                              </button>

                              <div className="my-1 border-t border-(--chat-dropdown-border)" />

                              {/* More */}
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                                onClick={() => setPlusMenuOpen(false)}
                              >
                                <span className="flex items-center gap-3">
                                  <MoreHorizontal className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                                  More
                                </span>
                                <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
                          >
                            <ModelLogo provider={availableModels.find(m => m.id === selectedModel)?.provider || ""} className="h-3.5 w-3.5" />
                            {availableModels.find(m => m.id === selectedModel)?.displayName || "Model"}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          
                          {modelDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setModelDropdownOpen(false)}
                              />
                              <div className="absolute bottom-full left-0 mb-2 z-20 w-56 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) p-1.5 shadow-2xl">
                                {availableModels.map((model) => (
                                  <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(model.id);
                                      setModelDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-(--chat-dropdown-hover) cursor-pointer",
                                      selectedModel === model.id ? "text-(--chat-text) bg-[var(--chat-dropdown-hover)]" : "text-(--chat-text-muted)"
                                    )}
                                  >
                                    <ModelLogo provider={model.provider} className="h-4 w-4 shrink-0" />
                                    <span className="flex-1">{model.displayName}</span>
                                    {selectedModel === model.id && <Check className="h-3.5 w-3.5 text-(--chat-action-icon)" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--chat-send-bg) text-white transition hover:bg-(--chat-send-bg-hover) disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="inline-flex items-center gap-1.5 rounded-full border border-(--chat-chip-border) bg-transparent px-3.5 py-1.5 text-xs text-(--chat-chip-text) transition hover:border-(--chat-dropdown-border) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-chip-text-hover)"
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

                  // Strip the user query that the backend echoes at the start of AI responses
                  let displayContent = message.content;
                  if (!isUser && index > 0) {
                    const prevMsg = messages[index - 1];
                    if (
                      prevMsg?.role === "user" &&
                      prevMsg.content &&
                      displayContent.startsWith(prevMsg.content)
                    ) {
                      displayContent = displayContent
                        .slice(prevMsg.content.length)
                        .trimStart();
                    }
                  }

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
                          <div className="rounded-full bg-(--chat-user-bubble) px-5 py-2.5 text-[15px] leading-6 text-(--chat-user-bubble-text)">
                            {message.content}
                          </div>
                          <p className="mt-1 text-right text-[11px] text-(--chat-timestamp)">
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      ) : (
                        /* ── AI response: no bubble, full-width text ── */
                        <div className="w-full max-w-none">
                          {displayContent ? (
                            <p className="whitespace-pre-wrap text-[15px] leading-8 text-(--chat-ai-text)">
                              {displayContent}
                            </p>
                          ) : null}

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
                                    className="rounded-xl border border-(--chat-dropdown-border) bg-(--chat-source-card) p-3 text-xs transition hover:bg-(--chat-source-card-hover)"
                                  >
                                    <p className="font-medium text-(--chat-source-title)">
                                      {source.title || "Source"}
                                    </p>
                                    {source.snippet ? (
                                      <p className="mt-1 line-clamp-3 text-(--chat-source-snippet)">
                                        {source.snippet}
                                      </p>
                                    ) : null}
                                    {href ? (
                                      <p className="mt-2 inline-flex items-center gap-1 text-(--chat-source-link)">
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
                                  className="inline-flex items-center gap-1 rounded-full border border-(--chat-dropdown-border) bg-(--chat-tool-badge) px-2.5 py-1 text-xs text-(--chat-tool-badge-text)"
                                >
                                  <MessageSquareText className="h-3 w-3" />
                                  {tool.name}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {message.isStreaming ? (
                            <div className="mt-3 inline-flex items-center gap-2 text-xs text-(--chat-loading)">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              thinking...
                            </div>
                          ) : null}

                          {/* Action bar */}
                          {!message.isStreaming && displayContent ? (
                            <div className="mt-4 flex items-center gap-1">
                              <p className="mr-2 text-[11px] text-(--chat-timestamp)">
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
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
                                  aria-label={action.label}
                                  onClick={() => {
                                    if (action.label === "Copy" && displayContent) {
                                      void navigator.clipboard.writeText(displayContent);
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
        <footer className="bg-(--chat-bg) px-3 py-3 md:px-6">
          <form className="mx-auto w-full max-w-3xl" onSubmit={handleComposerSubmit}>
            <div className="rounded-2xl border border-(--chat-composer-border) bg-(--chat-composer) px-4 pb-2.5 pt-3">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ask a follow-up"
                rows={1}
                disabled={isSending || isBootstrapping}
                className="w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-(--chat-input-text) outline-none placeholder:text-(--chat-input-placeholder)"
              />

              <div className="mt-2 flex items-center justify-between">
                {/* Left — attach */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full border border-(--chat-composer-border) text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
                      plusMenuOpen && "bg-(--chat-dropdown-hover) text-(--chat-action-icon-hover)"
                    )}
                    aria-label="Attach"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  {/* Plus Menu Popup */}
                  {plusMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setPlusMenuOpen(false)}
                      />
                      <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl z-50">
                        {/* Upload files */}
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                          onClick={() => setPlusMenuOpen(false)}
                        >
                          <Paperclip className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                          Upload files or images
                        </button>

                        {/* Cloud */}
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                          onClick={() => setPlusMenuOpen(false)}
                        >
                          <span className="flex items-center gap-3">
                            <Cloud className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                            Add files from cloud
                          </span>
                          <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                        </button>

                        <div className="my-1 border-t border-(--chat-dropdown-border)" />

                        {/* Deep research */}
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-(--chat-dropdown-hover)"
                          onClick={() => setPlusMenuOpen(false)}
                        >
                          <Telescope className="mt-0.5 h-[18px] w-[18px] text-(--chat-text-secondary)" />
                          <div>
                            <div className="text-sm font-medium text-(--chat-text)">Deep research</div>
                            <div className="text-xs text-(--chat-text-muted)">In-depth reports and analysis</div>
                          </div>
                        </button>

                        {/* Model council */}
                        <button
                          type="button"
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-(--chat-dropdown-hover)"
                          onClick={() => setPlusMenuOpen(false)}
                        >
                          <Gavel className="mt-0.5 h-[18px] w-[18px] text-(--chat-text-secondary)" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-(--chat-text)">Model council</span>
                              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                                Max
                              </span>
                            </div>
                            <div className="text-xs text-(--chat-text-muted)">Multiple AI models at once</div>
                          </div>
                        </button>

                        <div className="my-1 border-t border-(--chat-dropdown-border)" />

                        {/* More */}
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                          onClick={() => setPlusMenuOpen(false)}
                        >
                          <span className="flex items-center gap-3">
                            <MoreHorizontal className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                            More
                          </span>
                          <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                  {/* Right — model, mic, send/stop */}
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
                    >
                      <ModelLogo provider={availableModels.find(m => m.id === selectedModel)?.provider || ""} className="h-3.5 w-3.5" />
                      {availableModels.find(m => m.id === selectedModel)?.displayName || "Model"}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    
                    {modelDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setModelDropdownOpen(false)}
                        />
                        <div className="absolute bottom-full right-0 mb-2 z-20 w-56 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) p-1.5 shadow-2xl">
                          {availableModels.map((model) => (
                            <button
                              key={model.id}
                              type="button"
                              onClick={() => {
                                setSelectedModel(model.id);
                                setModelDropdownOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-(--chat-dropdown-hover) cursor-pointer",
                                selectedModel === model.id ? "text-(--chat-text) bg-[var(--chat-dropdown-hover)]" : "text-(--chat-text-muted)"
                              )}
                            >
                              <ModelLogo provider={model.provider} className="h-4 w-4 shrink-0" />
                              <span className="flex-1">{model.displayName}</span>
                              {selectedModel === model.id && <Check className="h-3.5 w-3.5 text-(--chat-action-icon)" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--chat-stop-bg) text-(--chat-stop-text) transition hover:bg-(--chat-stop-bg-hover)"
                      aria-label="Stop"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isBootstrapping || !composer.trim()}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--chat-send-bg) text-white transition hover:bg-(--chat-send-bg-hover) disabled:cursor-not-allowed disabled:opacity-40"
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

