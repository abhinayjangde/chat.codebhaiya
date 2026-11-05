"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PanelLeft, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { getTimeGreeting, firstName } from "@/lib/greeting";
import { apiClient } from "@/lib/api";
import type { IResumeDoc } from "@/lib/types";

import { useAuthSession } from "@/hooks/use-auth-session";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useChatStream } from "@/hooks/use-chat-stream";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatComposer } from "@/components/chat/chat-composer";
import { DocumentLibrary } from "@/components/documents/document-library";
import { McpServerList } from "@/components/mcp/mcp-server-list";
import { ResumeSidePanel } from "@/components/resume/resume-side-panel";
import { ResumeWizardModal } from "@/components/resume/resume-wizard-modal";
import { SettingsView } from "@/components/settings/settings-view";

export function ChatApp() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showMcpSettings, setShowMcpSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [greeting, setGreeting] = useState(getTimeGreeting());

  // Resume Builder state
  const [resume, setResume] = useState<IResumeDoc | null>(null);
  const [resumeSidePanelOpen, setResumeSidePanelOpen] = useState(false);
  const [resumeFullscreen, setResumeFullscreen] = useState(false);
  const [showResumeWizard, setShowResumeWizard] = useState(false);

  const { theme, setTheme } = useTheme();

  // Auth & Session
  const {
    hydrated,
    tokens,
    user,
    setUser,
    runWithSession,
    handleLogout,
    handleDeleteAccount,
    handleChangePassword,
    handleSaveSystemInstructions,
  } = useAuthSession();

  // Chat History & Model Selection
  const {
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
    mcpServers,
    setMcpServers,
    selectedMcpServerIds,
    setSelectedMcpServerIds,
    loadChats,
    handleRenameChat,
    handleDeleteChat,
    handleDownloadPdf,
    handleTogglePin,
    handleToggleArchive,
    handleDuplicateChat,
    isShowingArchived,
    setIsShowingArchived,
  } = useChatHistory({
    tokens,
    runWithSession,
    setUser,
  });

  const handleResumeUpdated = useCallback((updated: IResumeDoc) => {
    setResume(updated);
    setResumeSidePanelOpen(true);
  }, []);

  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetMessageId) return;
    const timer = setTimeout(() => {
      setTargetMessageId(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [targetMessageId]);

  // Streaming & Message Generation
  const {
    messages,
    composer,
    setComposer,
    isLoadingMessages,
    isSending,
    canRetry,
    handleSendPrompt,
    handleGenerateImage,
    handleEditMessage,
    handleRegenerateMessage,
    handleRetry,
    handleStopStreaming,
    handleFileUpload,
    handleDocumentStatus,
    clearStreaming,
  } = useChatStream({
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
    onResumeUpdated: handleResumeUpdated,
    targetMessageId,
  });

  const handleSearchChats = useCallback(
    async (query: string) => {
      return runWithSession((accessToken) => apiClient.searchChats(query, accessToken));
    },
    [runWithSession]
  );

  const handleSelectChat = useCallback(
    (chatId: string, messageId?: string, isArchived?: boolean) => {
      setShowDocuments(false);
      setShowMcpSettings(false);
      setShowSettings(false);
      setResume(null);
      setResumeSidePanelOpen(false);

      if (isArchived !== undefined) {
        if (isArchived && !isShowingArchived) {
          setIsShowingArchived(true);
        } else if (!isArchived && isShowingArchived) {
          setIsShowingArchived(false);
        }
      }

      setTargetMessageId(messageId ?? null);
      setActiveChatId(chatId);
    },
    [isShowingArchived, setIsShowingArchived, setActiveChatId]
  );

  // Fetch resume for active chat session
  useEffect(() => {
    if (!tokens || !activeChatId) return;

    let cancelled = false;
    void runWithSession((token) => apiClient.getResume(activeChatId, token))
      .then((data) => {
        if (!cancelled) {
          setResume(data);
          if (data) {
            setResumeSidePanelOpen(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResume(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tokens, activeChatId, runWithSession]);

  // Keep greeting in sync with local time
  useEffect(() => {
    const refresh = () => setGreeting(getTimeGreeting());
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const handleNewChat = useCallback(() => {
    setShowDocuments(false);
    setShowMcpSettings(false);
    setActiveChatId(null);
    setResume(null);
    setResumeSidePanelOpen(false);
    setResumeFullscreen(false);
    clearStreaming();
    setChatError(null);
    setMobileSidebarOpen(false);
  }, [setActiveChatId, clearStreaming, setChatError]);

  const onLogoutWithCleanup = useCallback(async () => {
    clearStreaming();
    await handleLogout();
  }, [clearStreaming, handleLogout]);

  const onDeleteChatWithCleanup = useCallback(
    async (chatId: string) => {
      await handleDeleteChat(chatId);
      if (activeChatId === chatId) {
        clearStreaming();
      }
    },
    [handleDeleteChat, activeChatId, clearStreaming]
  );

  if (!hydrated || !tokens) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#212121] text-[#ececec]">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#2a2a2a] px-4 py-2 text-sm text-[#b8b8b8]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {hydrated ? "Redirecting to sign in..." : "Loading application..."}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-(--chat-bg) text-(--chat-text) print:h-auto print:overflow-visible print:bg-white print:block">
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onSearch={handleSearchChats}
        onNewChat={() => {
          setShowSettings(false);
          handleNewChat();
        }}
        onOpenDocuments={() => {
          setShowDocuments(true);
          setShowMcpSettings(false);
          setShowSettings(false);
        }}
        onDeleteChat={onDeleteChatWithCleanup}
        onRenameChat={handleRenameChat}
        onDownloadPdf={handleDownloadPdf}
        onDeleteAccount={async (confirmationText?: string) => {
          clearStreaming();
          await handleDeleteAccount(confirmationText);
        }}
        onChangePassword={handleChangePassword}
        onSaveSystemInstructions={handleSaveSystemInstructions}
        user={user}
        onLogout={onLogoutWithCleanup}
        theme={theme}
        setTheme={setTheme}
        isSending={isSending}
        isLoadingChats={isLoadingChats}
        isBootstrapping={isBootstrapping}
        language={language}
        setLanguage={setLanguage}
        onOpenMcpSettings={() => {
          setShowMcpSettings(true);
          setShowDocuments(false);
          setShowSettings(false);
        }}
        onOpenSettings={() => {
          setShowSettings(true);
          setShowDocuments(false);
          setShowMcpSettings(false);
        }}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        onDuplicateChat={handleDuplicateChat}
        isShowingArchived={isShowingArchived}
        setIsShowingArchived={setIsShowingArchived}
      />

      <div className="flex min-w-0 flex-1 flex-col">
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

        {showSettings ? (
          <SettingsView
            embedded
            onBack={() => setShowSettings(false)}
            onAllChatsDeleted={() => {
              setChats([]);
              setActiveChatId(null);
            }}
          />
        ) : showMcpSettings ? (
          <McpServerList
            runWithSession={runWithSession}
            onServersChange={setMcpServers}
            onBack={() => setShowMcpSettings(false)}
          />
        ) : showDocuments ? (
          <DocumentLibrary embedded onBack={() => setShowDocuments(false)} />
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden print:block print:h-auto print:overflow-visible">
            {/* Chat Column */}
            <div
              className={cn(
                "flex flex-col min-w-0 flex-1 transition-all duration-200 print:hidden",
                resumeSidePanelOpen && resume && activeChatId && (resumeFullscreen ? "hidden" : "md:w-1/2 lg:w-1/2 border-r border-border")
              )}
            >
              <main className="flex-1 overflow-y-auto">
                <ChatMessageList
                  messages={messages}
                  isLoadingMessages={isLoadingMessages}
                  chatError={chatError}
                  availableModels={availableModels}
                  onEditMessage={handleEditMessage}
                  onRegenerateMessage={handleRegenerateMessage}
                  onRetry={canRetry ? handleRetry : undefined}
                  onOpenResume={() => setResumeSidePanelOpen(true)}
                  targetMessageId={targetMessageId}
                />

                {messages.length === 0 && !isLoadingMessages && (
                  <div className="flex min-h-[calc(100vh-140px)] flex-col items-center justify-center">
                    <h2
                      className="mb-10 text-center text-4xl font-light tracking-wide text-(--chat-brand)"
                      style={{ fontFamily: "var(--font-fraunces), serif" }}
                    >
                      {greeting}
                      {user?.name ? `, ${firstName(user.name)}` : ""}
                    </h2>

                    <ChatComposer
                      onSend={(msg, atts) => handleSendPrompt(msg, atts)}
                      onGenerateImage={(prompt) => void handleGenerateImage(prompt)}
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
                      onOpenResumeWizard={() => setShowResumeWizard(true)}
                    />

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-(--chat-brand)/40 bg-(--chat-brand)/10 px-3.5 py-1.5 text-xs font-medium text-(--chat-brand) transition hover:bg-(--chat-brand)/20 cursor-pointer"
                        onClick={() => setShowResumeWizard(true)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Build Resume
                      </button>
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

              {messages.length > 0 && (
                <footer className="bg-(--chat-bg) px-3 py-3 md:px-6">
                  <ChatComposer
                    onSend={(msg, atts) => handleSendPrompt(msg, atts)}
                    onGenerateImage={(prompt) => void handleGenerateImage(prompt)}
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
                    onOpenResumeWizard={() => setShowResumeWizard(true)}
                  />
                </footer>
              )}
            </div>

            {/* Resume Side Panel Column */}
            {resumeSidePanelOpen && resume && activeChatId && (
              <div
                className={cn(
                  "min-w-0 flex flex-col transition-all duration-200 print:w-full print:block print:h-auto print:overflow-visible print:m-0 print:p-0",
                  resumeFullscreen ? "flex-1 w-full" : "w-full md:w-1/2 lg:w-1/2"
                )}
              >
                <ResumeSidePanel
                  resume={resume}
                  chatId={activeChatId}
                  runWithSession={runWithSession}
                  onClose={() => setResumeSidePanelOpen(false)}
                  onResumeUpdated={setResume}
                  isFullscreen={resumeFullscreen}
                  onToggleFullscreen={() => setResumeFullscreen(!resumeFullscreen)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resume Wizard Modal */}
      <div className="print:hidden">
        <ResumeWizardModal
          isOpen={showResumeWizard}
          onClose={() => setShowResumeWizard(false)}
          onSubmit={(prompt, atts) => handleSendPrompt(prompt, atts)}
          onUploadFile={handleFileUpload}
        />
      </div>
    </div>
  );
}
