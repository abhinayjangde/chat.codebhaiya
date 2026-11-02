
"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Loader2,
  PanelLeft,
} from "lucide-react";
import toast from "react-hot-toast";
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
  Attachment,
  ChatMessage,
  ChatSummary,
  UserProfile,
  ModelInfo,
  McpServer,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { 
  getErrorMessage, 
  isAbortError, 
  normalizeSource, 
  mergeSources, 
  mergeUsedTools, 
  consumeSseStream 
} from "@/lib/chat-utils";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatAuthForm } from "@/components/chat/chat-auth-form";
import { DocumentLibrary } from "@/components/documents/document-library";
import { McpServerList } from "@/components/mcp/mcp-server-list";
import { getTimeGreeting, firstName } from "@/lib/greeting";

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

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState(""); // Shared state for composer
  const [chatError, setChatError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<"english" | "hinglish">("english");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [selectedMcpServerIds, setSelectedMcpServerIds] = useState<string[]>([]);
  const [showMcpSettings, setShowMcpSettings] = useState(false);
  const [greeting, setGreeting] = useState(getTimeGreeting());
  const [streamSteps, setStreamSteps] = useState<{ id: "thinking" | "webSearch" | "analyzing"; label: string; status: "pending" | "active" | "complete" }[] | null>(null);
  
  const { theme, setTheme } = useTheme();

  const router = useRouter();

  // Refs used by features
  const streamAbortRef = useRef<AbortController | null>(null);
  const skipNextFetchRef = useRef(false);
  const isSendingRef = useRef(false);
  const replacementRef = useRef<{ editMessageId?: string; regenerateMessageId?: string } | undefined>(undefined);

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

  const loadMcpServers = useCallback(async () => {
    if (!tokens) {
      return;
    }

    try {
      const data = await runWithSession((accessToken) =>
        apiClient.listMcpServers(accessToken)
      );
      setMcpServers(data.servers ?? []);
    } catch {
      // MCP servers are optional; don't surface an error to the user
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
    const storedCollectionId = window.localStorage.getItem("chat.codebhaiya.collection");
    if (storedCollectionId) {
      setCollectionId(storedCollectionId);
      window.localStorage.removeItem("chat.codebhaiya.collection");
    }
  }, []);

  useEffect(() => {
    // Fetch available models on mount
    apiClient.listModels().then((data) => {
      setAvailableModels(data.models);
      setSelectedModel(data.default);
    }).catch(console.error);
  }, []);

  // Keep greeting in sync with the user's local time
  useEffect(() => {
    const refresh = () => setGreeting(getTimeGreeting());
    const timer = setInterval(refresh, 60_000); // check every minute
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
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
          if (mergedUser.preferences?.language) {
            setLanguage(mergedUser.preferences.language as "english" | "hinglish");
          }
          writeStoredUser(mergedUser);
          return mergedUser;
        });
        await loadChats();
        await loadMcpServers();
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
  }, [tokens, runWithSession, loadChats, loadMcpServers]);

  useEffect(() => {
    if (!tokens || !activeChatId) {
      if (!activeChatId) {
        setMessages([]);
      }
      return;
    }

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
    if (hydrated && !tokens) {
      router.replace("/login");
    }
  }, [hydrated, tokens, router]);

  const handleAuthSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
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
  }, [email, password, authMode, name]);

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

  const handleFileUpload = useCallback(
    async (file: File): Promise<Attachment> => {
      const uploaded = await runWithSession((accessToken) =>
        apiClient.uploadFile(file, accessToken)
      );

      return uploaded;
    },
    [runWithSession]
  );

  const handleDocumentStatus = useCallback(
    async (documentId: string): Promise<Pick<Attachment, "status" | "errorMessage">> => {
      const document = await runWithSession((accessToken) =>
        apiClient.getDocumentStatus(documentId, accessToken)
      );

      return {
        status: document.status,
        ...(document.errorMessage ? { errorMessage: document.errorMessage } : {}),
      };
    },
    [runWithSession]
  );

  const handleSendPrompt = useCallback(async (
    promptOverride?: string,
    attachments?: Attachment[],
    replacement?: { editMessageId?: string; regenerateMessageId?: string }
  ) => {
    if (!tokens || isSendingRef.current) {
      return;
    }

    const activeReplacement = replacement ?? replacementRef.current;
    const prompt = (promptOverride ?? composer).trim();
    if (!prompt && (!attachments || attachments.length === 0)) {
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
          apiClient.createChat(
            prompt,
            accessToken,
            selectedModel,
            attachments,
            language,
            collectionId ?? undefined,
            selectedMcpServerIds
          )
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
        attachments,
      };

      const assistantMessage: ChatMessage = {
        _id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: nowIso,
        sources: [],
        usedTools: [],
        isStreaming: true,
        modelName: selectedModel || undefined,
      };

      setMessages((previous) =>
        activeReplacement?.regenerateMessageId
          ? [...previous, assistantMessage]
          : [...previous, userMessage, assistantMessage]
      );

      const controller = new AbortController();
      streamAbortRef.current = controller;

      // Initialize stream status steps
      setStreamSteps([
        { id: "thinking", label: "Thinking", status: "active" },
        { id: "webSearch", label: "Web search", status: "pending" },
        { id: "analyzing", label: "Analyzing", status: "pending" },
      ]);

      const stream = await runWithSession((accessToken) =>
        apiClient.streamMessage(
          readyChatId, 
          prompt, 
          accessToken, 
          controller.signal,
          selectedModel,
          attachments,
          language,
          collectionId ?? undefined,
          activeReplacement,
          selectedMcpServerIds
        )
      );

      await consumeSseStream(stream, (event) => {
        if (event.type === "error") {
          throw new Error(event.error);
        }

        if (event.type === "token") {
          setStreamSteps(null);
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
          const isWebSearch = event.tool === "web_search";
          if (isWebSearch) {
            setStreamSteps((prev) =>
              prev
                ? prev.map((step) =>
                    step.id === "thinking"
                      ? { ...step, status: "complete" }
                      : step.id === "webSearch"
                      ? { ...step, status: "active" }
                      : step
                  )
                : null
            );
          }
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
          setStreamSteps((prev) =>
            prev
              ? prev.map((step) =>
                  step.id === "webSearch"
                    ? { ...step, status: "complete" }
                    : step.id === "analyzing"
                    ? { ...step, status: "active" }
                    : step
                )
              : null
          );
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
          setStreamSteps(null);
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
      setStreamSteps(null);
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
      replacementRef.current = undefined;
      skipNextFetchRef.current = true;
      isSendingRef.current = false;
      setStreamSteps(null);
      setIsSending(false);
    }
  }, [tokens, composer, activeChatId, user, selectedModel, language, collectionId, selectedMcpServerIds, runWithSession, loadChats]);

  const handleEditMessage = useCallback((message: ChatMessage) => {
    if (isSendingRef.current || !message._id) {
      return;
    }
    replacementRef.current = { editMessageId: message._id };
    setComposer(message.content);
    setMessages((current) => current.slice(0, current.findIndex((entry) => entry._id === message._id)));
  }, []);

  const handleRegenerateMessage = useCallback((message: ChatMessage, userMessage: ChatMessage) => {
    if (isSendingRef.current || !message._id || !userMessage._id) {
      return;
    }
    replacementRef.current = { regenerateMessageId: message._id };
    setMessages((current) => current.filter((entry) => entry._id !== message._id));
    void handleSendPrompt(userMessage.content, userMessage.attachments, replacementRef.current);
    replacementRef.current = undefined;
  }, [handleSendPrompt]);

  const handleStopStreaming = useCallback(() => {
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
  }, []);

  const handleDeleteChat = useCallback(async (chatId: string) => {
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
      toast.success("Chat deleted");
    } catch (error) {
        toast.error(getErrorMessage(error));
        setChatError(getErrorMessage(error));
    }
  }, [runWithSession, activeChatId]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      await runWithSession((accessToken) =>
        apiClient.deleteAccount(accessToken)
      );
      toast.success("Account deleted successfully");
      clearSession();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
      throw new Error(errorMessage); // Re-throw so the UI component stops loading state
    }
  }, [runWithSession, clearSession]);

  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await runWithSession((accessToken) =>
      apiClient.changePassword(currentPassword, newPassword, accessToken)
    );
  }, [runWithSession]);

  const handleSaveSystemInstructions = useCallback(async (instructions: string) => {
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
  }, [runWithSession]);

  const handleRenameChat = useCallback(async (chatId: string, title: string) => {
    try {
      const updated = await runWithSession((accessToken) =>
        apiClient.renameChat(chatId, title, accessToken)
      );

      setChats((current) =>
        current.map((c) =>
          c._id === chatId ? { ...c, title: updated.title } : c
        )
      );
      toast.success("Chat renamed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [runWithSession]);

  const handleDownloadPdf = useCallback((chatId: string) => {
    if (!tokens) return;
    
    const download = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9000/api"}/chat/${chatId}/pdf`, {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`
            }
        });
        
        if (!response.ok) throw new Error("Download failed");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${chatId}.pdf`; 
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("PDF download error:", error);
        setChatError("Failed to download PDF");
      }
    };
    
    void download();
  }, [tokens]);

  const handleNewChat = useCallback(() => {
    setShowDocuments(false);
    setActiveChatId(null);
    setMessages([]);
    setChatError(null);
    setMobileSidebarOpen(false);
    setIsSending(false);
  }, []);

  const handleOpenDocuments = useCallback(() => {
    setShowDocuments(true);
  }, []);

  const handleOpenMcpSettings = useCallback(() => {
    setShowMcpSettings(true);
    setShowDocuments(false);
  }, []);

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
      <ChatAuthForm
        authMode={authMode}
        setAuthMode={setAuthMode}
        name={name}
        setName={setName}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authError={authError}
        setAuthError={setAuthError}
        isAuthLoading={isAuthLoading}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-(--chat-bg) text-(--chat-text)">
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(chatId) => {
          setShowDocuments(false);
          setActiveChatId(chatId);
        }}
        onNewChat={handleNewChat}
        onOpenDocuments={handleOpenDocuments}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onDownloadPdf={handleDownloadPdf}
        onDeleteAccount={handleDeleteAccount}
        onChangePassword={handleChangePassword}
        onSaveSystemInstructions={handleSaveSystemInstructions}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
        isSending={isSending}
        isLoadingChats={isLoadingChats}
        isBootstrapping={isBootstrapping}
        language={language}
        setLanguage={setLanguage}
        onOpenMcpSettings={handleOpenMcpSettings}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sidebar toggle — visible when sidebar is closed (desktop) or always on mobile */}
        {/* Note: The mock said (!sidebarOpen || true), but logic implies (!sidebarOpen) or mobile. 
            The sidebar component handles the mobile overlay, but this button is the trigger. 
            In the original code: (!sidebarOpen || true) && (button...). 
            I'll keep it simple: visible if sidebar closed on desktop, or always on mobile if we want. 
            Actually, the original layout had it absolute positioned. */}
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

        {showMcpSettings ? (
          <McpServerList
            runWithSession={runWithSession}
            onServersChange={setMcpServers}
            onBack={() => setShowMcpSettings(false)}
          />
        ) : showDocuments ? (
          <DocumentLibrary embedded onBack={() => setShowDocuments(false)} />
        ) : (
          <main className="flex-1 overflow-y-auto">
            <ChatMessageList
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              chatError={chatError}
              availableModels={availableModels}
              streamSteps={streamSteps}
              onEditMessage={handleEditMessage}
              onRegenerateMessage={handleRegenerateMessage}
            />
          
          {messages.length === 0 && !isLoadingMessages && (
             <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center">
                 {/* Time-based greeting */}
                <h2
                  className="mb-10 text-center text-4xl font-light tracking-wide text-(--chat-brand)"
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                >
                  {greeting}{user?.name ? `, ${firstName(user.name)}` : ""}
                </h2>

                <ChatComposer
                  onSend={(msg, atts) => handleSendPrompt(msg, atts)}
                  isSending={isSending}
                  isBootstrapping={isBootstrapping}
                  availableModels={availableModels}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  onUploadFile={handleFileUpload}
                    onDocumentStatus={handleDocumentStatus}
                  variant="center"
                  inputValue={composer}
                  onInputChange={setComposer}
                  mcpServers={mcpServers}
                  selectedMcpServerIds={selectedMcpServerIds}
                  onMcpServerIdsChange={setSelectedMcpServerIds}
                />

                {/* Quick action chips */}
                {/* Note: Chips logic was inline. I should probably move chips to Composer or just keep here. 
                    I'll keep here for now as they interact with composer state. */}
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
          )}
          </main>
        )}

        {/* Bottom composer — only shown when messages exist */}
        {!showDocuments && messages.length > 0 && (
          <footer className="bg-(--chat-bg) px-3 py-3 md:px-6">
             <ChatComposer
                onSend={(msg, atts) => handleSendPrompt(msg, atts)}
                onStop={handleStopStreaming}
                isSending={isSending}
                isBootstrapping={isBootstrapping}
                availableModels={availableModels}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                onUploadFile={handleFileUpload}
                    onDocumentStatus={handleDocumentStatus}
                variant="footer"
                inputValue={composer}
                onInputChange={setComposer}
                mcpServers={mcpServers}
                selectedMcpServerIds={selectedMcpServerIds}
                onMcpServerIdsChange={setSelectedMcpServerIds}
              />

          </footer>
        )}
      </div>
    </div>
  );
}
