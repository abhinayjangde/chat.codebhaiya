"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PanelLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { getTimeGreeting, firstName } from "@/lib/greeting";

import { useAuthSession } from "@/hooks/use-auth-session";
import { useChatHistory } from "@/hooks/use-chat-history";
import { useChatStream } from "@/hooks/use-chat-stream";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatAuthForm } from "@/components/chat/chat-auth-form";
import { DocumentLibrary } from "@/components/documents/document-library";
import { McpServerList } from "@/components/mcp/mcp-server-list";

export function ChatApp() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showMcpSettings, setShowMcpSettings] = useState(false);
  const [greeting, setGreeting] = useState(getTimeGreeting());

  const { theme, setTheme } = useTheme();

  // Auth & Session
  const {
    hydrated,
    tokens,
    user,
    setUser,
    authMode,
    setAuthMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    authError,
    setAuthError,
    isAuthLoading,
    runWithSession,
    handleAuthSubmit,
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
  } = useChatHistory({
    tokens,
    runWithSession,
    setUser,
  });

  // Streaming & Message Generation
  const {
    messages,
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
  });

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
          setShowMcpSettings(false);
          setActiveChatId(chatId);
        }}
        onNewChat={handleNewChat}
        onOpenDocuments={() => {
          setShowDocuments(true);
          setShowMcpSettings(false);
        }}
        onDeleteChat={onDeleteChatWithCleanup}
        onRenameChat={handleRenameChat}
        onDownloadPdf={handleDownloadPdf}
        onDeleteAccount={async () => {
          clearStreaming();
          await handleDeleteAccount();
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
        }}
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
                <h2
                  className="mb-10 text-center text-4xl font-light tracking-wide text-(--chat-brand)"
                  style={{ fontFamily: "var(--font-fraunces), serif" }}
                >
                  {greeting}
                  {user?.name ? `, ${firstName(user.name)}` : ""}
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

        {!showMcpSettings && !showDocuments && messages.length > 0 && (
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
