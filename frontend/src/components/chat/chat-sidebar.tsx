
"use client";

import {
  ChevronRight,
  FileDown,
  FileText,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Share,
  Shield,
  SquarePen,
  Sun,
  SunMoon,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, memo } from "react";
import { cn } from "@/lib/utils";
import { ChatSummary, UserProfile } from "@/lib/types";
import { shortTitle } from "@/lib/chat-utils";
import { ExternalLink } from "lucide-react";

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDownloadPdf: (chatId: string) => void;
  onDeleteAccount: () => Promise<void>;
  user: UserProfile | null;
  onLogout: () => void;
  theme: string | undefined;
  setTheme: (theme: string) => void;
  isSending: boolean;
  isLoadingChats: boolean;
  isBootstrapping: boolean;
}

export const ChatSidebar = memo(function ChatSidebar({
  sidebarOpen,
  setSidebarOpen,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onDownloadPdf,
  onDeleteAccount,
  user,
  onLogout,
  theme,
  setTheme,
  isSending,
  isLoadingChats,
  isBootstrapping,
}: ChatSidebarProps) {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMenuOpenId, setChatMenuOpenId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [themeSubmenuOpen, setThemeSubmenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatOptionsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const filteredChats = chats.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchOpen &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
      if (
        chatMenuOpenId &&
        chatOptionsRef.current &&
        !chatOptionsRef.current.contains(event.target as Node)
      ) {
        setChatMenuOpenId(null);
      }
      if (
        settingsMenuOpen &&
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen, chatMenuOpenId, settingsMenuOpen]);

  const handleStartRename = (chatId: string, currentTitle: string) => {
    setRenamingChatId(chatId);
    setRenameTitle(currentTitle);
    setChatMenuOpenId(null);
  };

  const handleSaveRename = () => {
    if (renamingChatId && renameTitle.trim()) {
      onRenameChat(renamingChatId, renameTitle);
    }
    setRenamingChatId(null);
    setRenameTitle("");
  };

  const handleDeleteAccount = () => {
    setIsConfirmDeleteOpen(true);
  };

  const executeDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount();
      setIsConfirmDeleteOpen(false);
    } catch (err) {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
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
          sidebarOpen
            ? "md:translate-x-0 md:w-[260px] md:opacity-100"
            : "md:-translate-x-full md:w-0 md:opacity-0 md:overflow-hidden"
        )}
      >
        {/* ── Top bar: logo + new-chat icon ── */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-(--chat-text) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer"
            onClick={onNewChat}
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
            onClick={onNewChat}
            disabled={isSending}
          >
            <Plus className="h-[18px] w-[18px] text-(--chat-text-muted)" />
            New chat
          </button>
          {searchOpen ? (
            <div
              ref={searchRef}
              className="flex items-center gap-2 rounded-lg bg-(--chat-sidebar-active) px-3 py-1.5"
            >
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
                className="w-full bg-transparent px-3 py-1 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint)"
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
              <Search className="h-[18px] w-[18px]  text-(--chat-text-muted)" />
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
                {searchQuery.trim()
                  ? "No matching chats."
                  : "No conversations yet."}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredChats.map((chat, index) => (
                  <div key={chat._id} className="group relative">
                    {renamingChatId === chat._id ? (
                      <div className="w-full px-2 py-1">
                        <input
                          type="text"
                          value={renameTitle}
                          onChange={(e) => setRenameTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename();
                            if (e.key === "Escape") setRenamingChatId(null);
                          }}
                          onBlur={handleSaveRename}
                          autoFocus
                          className="w-full rounded bg-(--chat-surface) px-2 py-1 text-sm text-(--chat-text) outline-none ring-1 ring-(--chat-focus-ring)"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-lg px-3 py-2 pr-8 text-left text-sm transition hover:cursor-pointer",
                          chat._id === activeChatId
                            ? "bg-(--chat-sidebar-active) text-(--chat-text)"
                            : "text-(--chat-text-secondary) hover:bg-(--chat-sidebar-hover)"
                        )}
                        onClick={() => {
                          onSelectChat(chat._id);
                          setMobileSidebarOpen(false);
                        }}
                      >
                        <p className="truncate">
                          {shortTitle(chat.title || "New chat")}
                        </p>
                      </button>
                    )}

                    {/* ⋯ menu trigger */}
                    <button
                      type="button"
                      className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-(--chat-text-muted) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)",
                        chatMenuOpenId === chat._id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatMenuOpenId(
                          chatMenuOpenId === chat._id ? null : chat._id
                        );
                      }}
                      aria-label="Chat options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {/* Dropdown menu */}
                    {chatMenuOpenId === chat._id && (
                      <div
                        ref={chatOptionsRef}
                        className={cn(
                          "absolute right-0 z-50 w-full rounded-md border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl",
                          index > 3 && index >= filteredChats.length - 7
                            ? "bottom-full mb-1"
                            : "top-full mt-1"
                        )}
                      >
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
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(chat._id, chat.title || "");
                          }}
                        >
                          <SquarePen className="h-4 w-4 text-(--chat-label)" />
                          Rename
                        </button>
                        <div className="my-1 border-t border-(--chat-dropdown-border)" />
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                          onClick={() => {
                            setChatMenuOpenId(null);
                            onDownloadPdf(chat._id);
                          }}
                        >
                          <FileDown className="h-4 w-4 text-(--chat-label)" />
                          Download as PDF
                        </button>
                        <div className="my-1 border-t border-(--chat-dropdown-border)" />
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                          onClick={() => {
                            setChatMenuOpenId(null);
                            onDeleteChat(chat._id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
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
            <Link
              href="https://www.codebhaiya.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              codebhaiya.com
            </Link>
          </button>

          {/* Settings with popup */}
          <div className="relative" ref={settingsRef}>
            {settingsMenuOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-full rounded-md border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl">
                {/* Top group - Theme with hover submenu */}
                <div
                  className="relative"
                  onMouseEnter={() => setThemeSubmenuOpen(true)}
                  onMouseLeave={() => setThemeSubmenuOpen(false)}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) hover:cursor-pointer transition hover:bg-(--chat-dropdown-hover)"
                  >
                    <span className="flex items-center gap-3">
                      <SunMoon className="h-[18px] w-[18px] text-(--chat-label)" />
                      Theme
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#666]" />
                  </button>

                  {/* Theme submenu */}
                  {themeSubmenuOpen && (
                    <div className="absolute left-full top-0 z-60 ml-1 w-40 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl">
                      {[
                        { id: "light", label: "Light", icon: Sun },
                        { id: "dark", label: "Dark", icon: Moon },
                        { id: "system", label: "System", icon: Monitor },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                          onClick={() => {
                            setTheme(opt.id);
                            setThemeSubmenuOpen(false);
                            setSettingsMenuOpen(false);
                          }}
                        >
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full border",
                              theme === opt.id
                                ? "border-white bg-white"
                                : "border-[#666] bg-transparent"
                            )}
                          />
                          <opt.icon className="h-[16px] w-[16px] text-(--chat-label)" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="my-1.5 border-t border-(--chat-dropdown-border)" />

                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                  }}
                >
                  <FileText className="h-[18px] w-[18px] text-(--chat-label)" />
                  Terms of service
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                  }}
                >
                  <Shield className="h-[18px] w-[18px] text-(--chat-label)" />
                  Privacy policy
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                  }}
                >
                  <MessageCircle className="h-[18px] w-[18px] text-(--chat-label)" />
                  Send feedback
                </button>

                {/* Divider */}
                <div className="my-1.5 border-t border-(--chat-dropdown-border)" />

                {/* Logout */}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut className="h-[18px] w-[18px]" />
                  Log out
                </button>

                {/* Delete Account */}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeletingAccount}
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    handleDeleteAccount();
                  }}
                >
                  <Trash2 className="h-[18px] w-[18px]" />
                  {isDeletingAccount ? "Deleting..." : "Delete account"}
                </button>
              </div>
            )}

            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer",
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

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-(--chat-text)">
              Delete Account
            </h3>
            <p className="mb-6 text-sm text-(--chat-text-secondary) leading-relaxed">
              Are you sure you want to delete your account? This action is irreversible and will permanently delete all your chat history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-sidebar-hover) disabled:opacity-50"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={isDeletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
                onClick={executeDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
