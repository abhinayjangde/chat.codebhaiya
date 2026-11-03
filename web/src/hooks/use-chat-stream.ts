"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import type {
  Attachment,
  AuthTokens,
  ChatMessage,
  ChatSummary,
  IResumeDoc,
  UserProfile,
} from "@/lib/types";
import {
  consumeSseStream,
  getErrorMessage,
  isAbortError,
  mergeSources,
  mergeUsedTools,
  normalizeSource,
} from "@/lib/chat-utils";

interface UseChatStreamProps {
  tokens: AuthTokens | null;
  runWithSession: <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
  activeChatId: string | null;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>;
  setChats: React.Dispatch<React.SetStateAction<ChatSummary[]>>;
  loadChats: () => Promise<void>;
  user: UserProfile | null;
  selectedModel: string;
  language: "english" | "hinglish";
  collectionId: string | null;
  selectedMcpServerIds: string[];
  setChatError: React.Dispatch<React.SetStateAction<string | null>>;
  onResumeUpdated?: (resume: IResumeDoc) => void;
}

export type StreamStep = {
  id: "thinking" | "webSearch" | "analyzing";
  label: string;
  status: "pending" | "active" | "complete";
};

export function useChatStream({
  tokens,
  runWithSession,
  activeChatId,
  setActiveChatId,
  setChats,
  loadChats,
  user,
  selectedModel,
  language,
  collectionId,
  selectedMcpServerIds,
  setChatError,
  onResumeUpdated,
}: UseChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamSteps, setStreamSteps] = useState<StreamStep[] | null>(null);

  const streamAbortRef = useRef<AbortController | null>(null);
  const skipNextFetchRef = useRef(false);
  const isSendingRef = useRef(false);
  const replacementRef = useRef<
    { editMessageId?: string; regenerateMessageId?: string } | undefined
  >(undefined);

  // Fetch messages when activeChatId changes
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
        if (cancelled) return;

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
  }, [tokens, activeChatId, runWithSession, setChatError]);

  const handleFileUpload = useCallback(
    async (file: File): Promise<Attachment> => {
      return await runWithSession((accessToken) =>
        apiClient.uploadFile(file, accessToken)
      );
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

  const handleSendPrompt = useCallback(
    async (
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

          if (event.type === "resume_update") {
            if (onResumeUpdated && event.resume) {
              onResumeUpdated(event.resume);
            }
            return;
          }

          if (event.type === "token") {
            setStreamSteps(null);
            setMessages((previous) =>
              previous.map((message) => {
                if (message._id !== assistantMessageId) return message;
                let newContent = `${message.content}${event.content}`;
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
            if (event.resume && onResumeUpdated) {
              onResumeUpdated(event.resume);
            }
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
    },
    [
      tokens,
      composer,
      activeChatId,
      user,
      selectedModel,
      language,
      collectionId,
      selectedMcpServerIds,
      runWithSession,
      loadChats,
      setChats,
      setActiveChatId,
      setChatError,
      onResumeUpdated,
    ]
  );

  const handleEditMessage = useCallback((message: ChatMessage) => {
    if (isSendingRef.current || !message._id) {
      return;
    }
    replacementRef.current = { editMessageId: message._id };
    setComposer(message.content);
    setMessages((current) =>
      current.slice(0, current.findIndex((entry) => entry._id === message._id))
    );
  }, []);

  const handleRegenerateMessage = useCallback(
    (message: ChatMessage, userMessage: ChatMessage) => {
      if (isSendingRef.current || !message._id || !userMessage._id) {
        return;
      }
      replacementRef.current = { regenerateMessageId: message._id };
      setMessages((current) =>
        current.filter((entry) => entry._id !== message._id)
      );
      void handleSendPrompt(
        userMessage.content,
        userMessage.attachments,
        replacementRef.current
      );
      replacementRef.current = undefined;
    },
    [handleSendPrompt]
  );

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

  const clearStreaming = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setMessages([]);
    setIsSending(false);
    setIsLoadingMessages(false);
    setStreamSteps(null);
  }, []);

  return {
    messages,
    setMessages,
    composer,
    setComposer,
    isLoadingMessages,
    isSending,
    streamSteps,
    handleSendPrompt,
    handleEditMessage,
    handleRegenerateMessage,
    handleStopStreaming,
    handleFileUpload,
    handleDocumentStatus,
    clearStreaming,
  };
}
