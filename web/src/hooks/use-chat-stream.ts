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
  targetMessageId?: string | null;
}

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
  targetMessageId,
}: UseChatStreamProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const [composer, setComposer] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [canRetry, setCanRetry] = useState(false);

  const streamAbortRef = useRef<AbortController | null>(null);
  const skipNextFetchRef = useRef(false);
  const isSendingRef = useRef(false);
  const replacementRef = useRef<
    { editMessageId?: string; regenerateMessageId?: string } | undefined
  >(undefined);
  const retryRequestRef = useRef<{
    prompt: string;
    attachments?: Attachment[];
    replacement?: { editMessageId?: string; regenerateMessageId?: string };
    userMessageId: string;
    assistantMessageId: string;
    chatId: string | null;
    imageGeneration?: boolean;
  } | null>(null);

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

    // If targetMessageId is already loaded in messages, skip re-fetching
    if (
      targetMessageId &&
      messagesRef.current.length > 0 &&
      messagesRef.current.some((m) => m._id === targetMessageId)
    ) {
      return;
    }

    let cancelled = false;
    setIsLoadingMessages(true);
    setChatError(null);

    void runWithSession((accessToken) =>
      apiClient.listMessages(
        activeChatId,
        accessToken,
        targetMessageId ? { around: targetMessageId } : undefined
      )
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
  }, [tokens, activeChatId, targetMessageId, runWithSession, setChatError]);

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

  const handleGenerateImage = useCallback(async (promptOverride?: string) => {
    const prompt = (promptOverride ?? composer).trim();
    if (!tokens || !prompt || isSendingRef.current) return;

    setComposer("");
    setChatError(null);
    setCanRetry(false);
    setIsSending(true);
    isSendingRef.current = true;
    const nowIso = new Date().toISOString();
    let targetChatId = activeChatId;
    const retryRequest = {
      prompt,
      userMessageId: `local-user-${Date.now()}`,
      assistantMessageId: `local-assistant-${Date.now()}`,
      chatId: targetChatId,
      imageGeneration: true,
    };
    retryRequestRef.current = retryRequest;

    try {
      if (!targetChatId) {
        const created = await runWithSession((accessToken) =>
          apiClient.createChat(prompt, accessToken, selectedModel, undefined, language)
        );
        targetChatId = String(created.chatId);
        if (retryRequestRef.current) {
          retryRequestRef.current.chatId = targetChatId;
        }
        const provisionalChat: ChatSummary = {
          _id: targetChatId,
          userId: user?.id ?? user?.userId ?? "",
          title: created.title,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        setChats((previous) => [provisionalChat, ...previous.filter((chat) => chat._id !== targetChatId)]);
        skipNextFetchRef.current = true;
        setActiveChatId(targetChatId);
      }

      const result = await runWithSession((accessToken) =>
        apiClient.generateImage(targetChatId!, prompt, accessToken, "google")
      );
      const userMessage: ChatMessage = {
        _id: result.userMessageId,
        role: "user",
        content: prompt,
        createdAt: nowIso,
      };
      const assistantMessage: ChatMessage = {
        _id: result.assistantMessageId,
        role: "assistant",
        content: "Image generated.",
        createdAt: new Date().toISOString(),
        modelName: result.modelName,
        attachments: [result.attachment],
      };
      setMessages((previous) => [...previous, userMessage, assistantMessage]);
      setChats((previous) => previous.map((chat) => chat._id === targetChatId
        ? { ...chat, title: chat.title || prompt.slice(0, 60), updatedAt: new Date().toISOString() }
        : chat
      ));
      retryRequestRef.current = null;
      setCanRetry(false);
    } catch (error) {
      setComposer(prompt);
      setChatError(getErrorMessage(error));
      setCanRetry(true);
    } finally {
      skipNextFetchRef.current = false;
      isSendingRef.current = false;
      setIsSending(false);
    }
  }, [tokens, composer, activeChatId, runWithSession, selectedModel, language, user, setChats, setActiveChatId, setChatError, setComposer]);

  const handleSendPrompt = useCallback(
    async (
      promptOverride?: string,
      attachments?: Attachment[],
      replacement?: { editMessageId?: string; regenerateMessageId?: string },
      retryContext?: { userMessageId: string; assistantMessageId: string; chatId: string | null }
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
      setCanRetry(false);
      setIsSending(true);
      isSendingRef.current = true;

      let targetChatId = retryContext?.chatId ?? activeChatId;
      const nowIso = new Date().toISOString();
      const userMessageId = retryContext?.userMessageId ?? `local-user-${Date.now()}`;
      const assistantMessageId = retryContext?.assistantMessageId ?? `local-assistant-${Date.now()}`;
      let persistedAssistantId: string | null = null;
      let persistedUserId: string | null = null;
      let receivedToken = false;

      if (!retryContext) {
        retryRequestRef.current = {
          prompt,
          attachments,
          replacement: activeReplacement,
          userMessageId,
          assistantMessageId,
          chatId: targetChatId,
        };
      }

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
          if (retryRequestRef.current?.assistantMessageId === assistantMessageId) {
            retryRequestRef.current.chatId = targetChatId;
          }

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

        if (retryContext) {
          setMessages((previous) => {
            if (previous.some((message) => message._id === assistantMessageId)) {
              return previous.map((message) => message._id === assistantMessageId
                ? { ...message, isStreaming: true, errorMessage: undefined, activeTool: undefined }
                : message
              );
            }
            return activeReplacement?.regenerateMessageId
              ? [...previous, assistantMessage]
              : [...previous, userMessage, assistantMessage];
          });
        } else {
          setMessages((previous) =>
            activeReplacement?.regenerateMessageId
              ? [...previous, assistantMessage]
              : [...previous, userMessage, assistantMessage]
          );
        }

        const controller = new AbortController();
        streamAbortRef.current = controller;

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
            setMessages((previous) =>
              previous.map((message) => {
                const isAssistant = message._id === assistantMessageId || (persistedAssistantId && message._id === persistedAssistantId);
                if (!isAssistant) return message;
                let newContent = `${receivedToken ? message.content : ""}${event.content}`;
                receivedToken = true;
                if (newContent.startsWith(prompt)) {
                  newContent = newContent.slice(prompt.length);
                }
                return { ...message, content: newContent, activeTool: undefined };
              })
            );
            return;
          }

          if (event.type === "sources") {
            setMessages((previous) =>
              previous.map((message) =>
                message._id === assistantMessageId || (persistedAssistantId && message._id === persistedAssistantId)
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
                message._id === assistantMessageId || (persistedAssistantId && message._id === persistedAssistantId)
                  ? {
                      ...message,
                      activeTool: event.tool,
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
                message._id === assistantMessageId || (persistedAssistantId && message._id === persistedAssistantId)
                  ? {
                      ...message,
                      activeTool: undefined,
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
            if (event.resume && onResumeUpdated) {
              onResumeUpdated(event.resume);
            }
            if (event.messageId) {
              persistedAssistantId = event.messageId;
            }
            if (event.userMessageId) {
              persistedUserId = event.userMessageId;
            }
            setMessages((previous) =>
              previous.map((message) => {
                const isAssistant = message._id === assistantMessageId || (persistedAssistantId && message._id === persistedAssistantId);
                if (isAssistant) {
                  return {
                    ...message,
                    _id: persistedAssistantId ?? message._id,
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
                    activeTool: undefined,
                  };
                }
                if (persistedUserId && message._id === userMessageId) {
                  return {
                    ...message,
                    _id: persistedUserId,
                  };
                }
                return message;
              })
            );
          }
        });

        setMessages((previous) =>
          previous.map((message) => {
            const isAssistant = message._id === assistantMessageId || (persistedAssistantId && message._id === persistedAssistantId);
            if (isAssistant) {
              return {
                ...message,
                _id: persistedAssistantId ?? message._id,
                isStreaming: false,
                activeTool: undefined,
                content:
                  message.content.trim() ||
                  "I could not generate a response for that prompt.",
              };
            }
            if (persistedUserId && message._id === userMessageId) {
              return {
                ...message,
                _id: persistedUserId,
              };
            }
            return message;
          })
        );

        await loadChats();
        retryRequestRef.current = null;
        setCanRetry(false);
      } catch (error) {
        if (isAbortError(error)) {
          setCanRetry(false);
          setMessages((previous) =>
            previous.map((entry) =>
              (entry._id === assistantMessageId || (persistedAssistantId && entry._id === persistedAssistantId))
                ? {
                    ...entry,
                    _id: persistedAssistantId ?? entry._id,
                    isStreaming: false,
                    activeTool: undefined,
                    content: entry.content.trim() || "Generation stopped.",
                  }
                : entry
            )
          );
          return;
        }

        const message = getErrorMessage(error);
        if (retryRequestRef.current?.assistantMessageId === assistantMessageId) {
          retryRequestRef.current.chatId = targetChatId;
        }

        setMessages((previous) =>
          previous.map((entry) =>
            (entry._id === assistantMessageId || (persistedAssistantId && entry._id === persistedAssistantId))
              ? {
                  ...entry,
                  _id: persistedAssistantId ?? entry._id,
                  isStreaming: false,
                  activeTool: undefined,
                  errorMessage: message,
                }
              : entry
          )
        );
        if (!targetChatId) {
          setChatError(message);
        }
        setCanRetry(true);
        if (!retryContext) {
          setComposer(prompt);
        }
      } finally {
        streamAbortRef.current = null;
        replacementRef.current = undefined;
        skipNextFetchRef.current = true;
        isSendingRef.current = false;
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

  const handleRetry = useCallback(() => {
    const request = retryRequestRef.current;
    if (!request || isSendingRef.current) return;
    if (request.imageGeneration) {
      void handleGenerateImage(request.prompt);
      return;
    }
    setChatError(null);
    void handleSendPrompt(request.prompt, request.attachments, request.replacement, {
      userMessageId: request.userMessageId,
      assistantMessageId: request.assistantMessageId,
      chatId: request.chatId,
    });
  }, [handleSendPrompt, handleGenerateImage, setChatError]);

  const handleEditMessage = useCallback((message: ChatMessage) => {
    if (isSendingRef.current || !message._id) {
      return;
    }
    replacementRef.current = { editMessageId: message._id };
    retryRequestRef.current = null;
    setCanRetry(false);
    setChatError(null);
    setComposer(message.content);
    setMessages((current) => {
      const msgIndex = current.findIndex((entry) => entry._id === message._id);
      if (msgIndex !== -1) {
        return current.slice(0, msgIndex);
      }
      return current;
    });
  }, [setChatError]);

  const handleRegenerateMessage = useCallback(
    (message: ChatMessage, userMessage: ChatMessage) => {
      if (isSendingRef.current) {
        return;
      }
      const targetAssistantId = message._id;
      const targetContent = userMessage.content || "";
      const targetAttachments = userMessage.attachments;

      replacementRef.current = targetAssistantId ? { regenerateMessageId: targetAssistantId } : undefined;
      setMessages((current) => {
        if (!targetAssistantId) return current;
        const msgIndex = current.findIndex((entry) => entry._id === targetAssistantId);
        if (msgIndex !== -1) {
          return current.slice(0, msgIndex);
        }
        return current.filter((entry) => entry._id !== targetAssistantId);
      });
      void handleSendPrompt(
        targetContent,
        targetAttachments,
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
    setCanRetry(false);
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
    setCanRetry(false);
    retryRequestRef.current = null;
  }, []);

  return {
    messages,
    setMessages,
    composer,
    setComposer,
    isLoadingMessages,
    isSending,
    canRetry,
    handleSendPrompt,
    handleRetry,
    handleGenerateImage,
    handleEditMessage,
    handleRegenerateMessage,
    handleStopStreaming,
    handleFileUpload,
    handleDocumentStatus,
    clearStreaming,
  };
}
