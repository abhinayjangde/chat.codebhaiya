"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api";
import { writeStoredUser } from "@/lib/storage";
import type { AuthTokens, ChatSummary, ModelInfo, McpServer, UserProfile } from "@/lib/types";
import { getErrorMessage } from "@/lib/chat-utils";

interface UseChatHistoryProps {
  tokens: AuthTokens | null;
  runWithSession: <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

function sortChats(chats: ChatSummary[]): ChatSummary[] {
  return [...chats].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function useChatHistory({ tokens, runWithSession, setUser }: UseChatHistoryProps) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isShowingArchived, setIsShowingArchived] = useState(false);

  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [language, setLanguage] = useState<"english" | "hinglish">("english");
  const [collectionId, setCollectionId] = useState<string | null>(null);

  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [selectedMcpServerIds, setSelectedMcpServerIds] = useState<string[]>([]);

  // Load models on initial mount
  useEffect(() => {
    apiClient
      .listModels()
      .then((data) => {
        setAvailableModels(data.models);
        setSelectedModel(data.default);
      })
      .catch(console.error);
  }, []);

  // Check stored collection id on initial mount
  useEffect(() => {
    const storedCollectionId = window.localStorage.getItem("chat.codebhaiya.collection");
    if (storedCollectionId) {
      setCollectionId(storedCollectionId);
      window.localStorage.removeItem("chat.codebhaiya.collection");
    }
  }, []);

  const loadChats = useCallback(async (archived?: boolean) => {
    if (!tokens) return;

    setIsLoadingChats(true);
    setChatError(null);

    try {
      const showArchived = archived ?? isShowingArchived;
      const data = await runWithSession((accessToken) => apiClient.listChats(accessToken, showArchived));
      const ordered = sortChats(data.chats);

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
  }, [tokens, runWithSession, isShowingArchived]);

  const loadMcpServers = useCallback(async () => {
    if (!tokens) return;

    try {
      const data = await runWithSession((accessToken) => apiClient.listMcpServers(accessToken));
      setMcpServers(data.servers ?? []);
    } catch {
      // MCP servers are optional; do not surface an error
    }
  }, [tokens, runWithSession]);

  // Bootstrap user profile, chats, and MCP servers once authenticated
  useEffect(() => {
    if (!tokens) return;

    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setChatError(null);

      try {
        const meData = await runWithSession((accessToken) => apiClient.me(accessToken));
        if (cancelled) return;

        setUser((current) => {
          const mergedUser: UserProfile = {
            ...current,
            ...meData.user,
            id: meData.user.id ?? meData.user.userId ?? current?.id ?? current?.userId ?? "",
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
  }, [tokens, runWithSession, loadChats, loadMcpServers, setUser]);

  const handleRenameChat = useCallback(
    async (chatId: string, title: string) => {
      try {
        const updated = await runWithSession((accessToken) =>
          apiClient.renameChat(chatId, title, accessToken)
        );

        setChats((current) =>
          current.map((c) => (c._id === chatId ? { ...c, title: updated.title } : c))
        );
        toast.success("Chat renamed");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [runWithSession]
  );

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      try {
        await runWithSession((accessToken) => apiClient.deleteChat(chatId, accessToken));
        setChats((prev) => prev.filter((c) => c._id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
        }
        toast.success("Chat deleted");
      } catch (error) {
        toast.error(getErrorMessage(error));
        setChatError(getErrorMessage(error));
      }
    },
    [runWithSession, activeChatId]
  );

  const handleDownloadPdf = useCallback(
    (chatId: string) => {
      if (!tokens) return;

      const download = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9000/api"}/chat/${chatId}/pdf`,
            {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
              },
            }
          );

          if (!response.ok) throw new Error("Download failed");

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
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
    },
    [tokens]
  );

  const handleToggleShowArchived = useCallback((showArchived: boolean) => {
    setIsShowingArchived(showArchived);
    void loadChats(showArchived);
  }, [loadChats]);

  const handleTogglePin = useCallback(
    async (chatId: string, currentPinned: boolean) => {
      try {
        const nextPinned = !currentPinned;
        await runWithSession((accessToken) =>
          apiClient.updateChat(chatId, { isPinned: nextPinned }, accessToken)
        );

        setChats((current) =>
          sortChats(
            current.map((c) =>
              c._id === chatId ? { ...c, isPinned: nextPinned, updatedAt: new Date().toISOString() } : c
            )
          )
        );
        toast.success(nextPinned ? "Chat pinned to top" : "Chat unpinned");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [runWithSession]
  );

  const handleToggleArchive = useCallback(
    async (chatId: string, currentArchived: boolean) => {
      try {
        const nextArchived = !currentArchived;
        await runWithSession((accessToken) =>
          apiClient.updateChat(chatId, { isArchived: nextArchived }, accessToken)
        );

        setChats((current) => current.filter((c) => c._id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
        }
        toast.success(nextArchived ? "Chat archived" : "Chat restored from archive");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [runWithSession, activeChatId]
  );

  const handleDuplicateChat = useCallback(
    async (chatId: string) => {
      try {
        const data = await runWithSession((accessToken) =>
          apiClient.duplicateChat(chatId, accessToken)
        );

        const newChat: ChatSummary = data.chat ?? {
          _id: data.chatId,
          title: data.title,
          userId: "",
          isPinned: false,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setChats((current) => sortChats([newChat, ...current]));
        setActiveChatId(newChat._id);
        toast.success("Chat duplicated");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [runWithSession]
  );

  return {
    chats,
    setChats,
    activeChatId,
    setActiveChatId,
    isLoadingChats,
    isBootstrapping,
    chatError,
    setChatError,
    availableModels,
    selectedModel,
    setSelectedModel,
    language,
    setLanguage,
    collectionId,
    setCollectionId,
    mcpServers,
    setMcpServers,
    selectedMcpServerIds,
    setSelectedMcpServerIds,
    loadChats,
    handleRenameChat,
    handleDeleteChat,
    handleDownloadPdf,
    isShowingArchived,
    setIsShowingArchived: handleToggleShowArchived,
    handleTogglePin,
    handleToggleArchive,
    handleDuplicateChat,
  };
}
