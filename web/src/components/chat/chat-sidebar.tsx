
"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bell,
  ChevronRight,
  CircleUser,
  Cog,
  Copy,
  FileDown,
  FileText,
  GraduationCap,
  Info,
  KeyRound,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Pin,
  PinOff,
  Plus,
  Plug,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Library,
  SquarePen,
  Sun,
  SunMoon,
  Languages,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  AlertTriangle,
  Activity,
  Megaphone,
  User,
  X,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, memo } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { ChatSummary, SearchChatsResponse, UserProfile } from "@/lib/types";
import { apiClient, type UsageSummary } from "@/lib/api";
import { readStoredTokens } from "@/lib/storage";
import { formatDateLabel, shortTitle } from "@/lib/chat-utils";
import { ExternalLink } from "lucide-react";
import { ChangePasswordModal } from "./sidebar/change-password-modal";
import { CustomInstructionsModal } from "./sidebar/custom-instructions-modal";
import { DeleteAccountModal } from "./sidebar/delete-account-modal";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark
            key={i}
            className="rounded bg-amber-400/35 text-amber-950 dark:bg-amber-400/30 dark:text-amber-200 font-semibold px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function formatUsageBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1_024;
  let unitIndex = 0;
  while (value >= 1_024 && unitIndex < units.length - 1) {
    value /= 1_024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function UsageQuotaLine({
  label,
  used,
  limit,
  detail,
}: {
  label: string;
  used: number;
  limit: number;
  detail?: string;
}) {
  const remaining = Math.max(0, limit - used);
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-(--chat-text)">{label}</span>
        <span className="tabular-nums text-(--chat-text-muted)">
          {used.toLocaleString()} / {limit.toLocaleString()}
          <span className="ml-1.5 text-(--chat-brand)">{remaining.toLocaleString()} left</span>
        </span>
      </div>
      {detail && <p className="text-[10px] text-(--chat-text-faint)">{detail}</p>}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-(--chat-dropdown-hover)"
        role="progressbar"
        aria-label={`${label} monthly quota`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
      >
        <div
          className="h-full rounded-full bg-(--chat-brand) transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string, messageId?: string, isArchived?: boolean) => void;
  onSearch?: (query: string) => Promise<SearchChatsResponse>;
  onNewChat: () => void;
  onOpenDocuments: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDownloadPdf: (chatId: string) => void;
  onDeleteAccount: (confirmationText?: string) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onSaveSystemInstructions: (instructions: string) => Promise<void>;
  user: UserProfile | null;
  onLogout: () => void;
  theme: string | undefined;
  setTheme: (theme: string) => void;
  isSending: boolean;
  isLoadingChats: boolean;
  isBootstrapping: boolean;
  language: "english" | "hinglish";
  setLanguage: (lang: "english" | "hinglish") => void;
  onOpenMcpSettings: () => void;
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  onToggleArchive: (chatId: string, isArchived: boolean) => void;
  onDuplicateChat: (chatId: string) => void;
  isShowingArchived: boolean;
  setIsShowingArchived: (show: boolean) => void;
  onOpenSettings?: () => void;
}

export const ChatSidebar = memo(function ChatSidebar({
  sidebarOpen,
  setSidebarOpen,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  chats,
  activeChatId,
  onSelectChat,
  onSearch,
  onNewChat,
  onOpenDocuments,
  onDeleteChat,
  onRenameChat,
  onDownloadPdf,
  onDeleteAccount,
  onChangePassword,
  onSaveSystemInstructions,
  user,
  onLogout,
  theme,
  setTheme,
  isSending,
  isLoadingChats,
  isBootstrapping,
  language,
  setLanguage,
  onOpenMcpSettings,
  onOpenSettings,
  onTogglePin,
  onToggleArchive,
  onDuplicateChat,
  isShowingArchived,
  setIsShowingArchived,
}: ChatSidebarProps) {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchChatsResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const usageUserId = user?.id ?? user?.userId;

  // Debounced message and chat search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !onSearch) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await onSearch(trimmed);
        setSearchResults(data);
      } catch {
        setSearchError("Failed to search messages");
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [chatMenuOpenId, setChatMenuOpenId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<
    "theme" | "language" | "customize" | "you" | "more" | null
  >(null);

  // Modals
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const chatOptionsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const usageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUsageOpen || !usageUserId) return;

    const tokens = readStoredTokens();
    if (!tokens?.accessToken) {
      setUsageError("Sign in again to view usage.");
      return;
    }

    let isCurrent = true;
    setIsUsageLoading(true);
    setUsageError(null);
    void apiClient.getUsage(tokens.accessToken)
      .then((summary) => {
        if (isCurrent) setUsageSummary(summary);
      })
      .catch(() => {
        if (isCurrent) setUsageError("Usage could not be loaded. Try again.");
      })
      .finally(() => {
        if (isCurrent) setIsUsageLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isUsageOpen, isSending, usageUserId]);

  const handleMouseEnter = (menu: "theme" | "language" | "customize" | "you" | "more") => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches &&
      window.innerWidth >= 768
    ) {
      setActiveSubmenu(menu);
    }
  };

  const handleMouseLeave = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches &&
      window.innerWidth >= 768
    ) {
      setActiveSubmenu(null);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedChats = filteredChats.filter((c) => c.isPinned);
  const recentChats = filteredChats.filter((c) => !c.isPinned);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
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
        setActiveSubmenu(null);
      }
      if (
        isUsageOpen &&
        usageRef.current &&
        !usageRef.current.contains(event.target as Node)
      ) {
        setIsUsageOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [searchOpen, chatMenuOpenId, settingsMenuOpen, isUsageOpen]);

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

  const renderChatItem = (chat: ChatSummary, index: number, listLength: number) => {
    return (
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
              "w-full rounded-lg px-3 py-2 pr-8 text-left text-sm transition hover:cursor-pointer flex items-center justify-between gap-1.5",
              chat._id === activeChatId
                ? "bg-(--chat-sidebar-active) text-(--chat-text)"
                : "text-(--chat-text-secondary) hover:bg-(--chat-sidebar-hover)"
            )}
            onClick={() => {
              onSelectChat(chat._id);
              setMobileSidebarOpen(false);
            }}
          >
            <p className="truncate flex-1">
              {shortTitle(chat.title || "New chat")}
            </p>
            {chat.isPinned && (
              <Pin className="h-3 w-3 shrink-0 text-(--chat-text-muted)" />
            )}
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
              index > 3 && index >= listLength - 7
                ? "bottom-full mb-1"
                : "top-full mt-1"
            )}
          >
            {!isShowingArchived && (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                onClick={() => {
                  setChatMenuOpenId(null);
                  onTogglePin(chat._id, !!chat.isPinned);
                }}
              >
                {chat.isPinned ? (
                  <>
                    <PinOff className="h-4 w-4 text-(--chat-label)" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4 text-(--chat-label)" />
                    Pin to top
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
              onClick={() => {
                setChatMenuOpenId(null);
                onDuplicateChat(chat._id);
              }}
            >
              <Copy className="h-4 w-4 text-(--chat-label)" />
              Duplicate
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
              onClick={() => {
                setChatMenuOpenId(null);
                onToggleArchive(chat._id, !!chat.isArchived);
              }}
            >
              {isShowingArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 text-(--chat-label)" />
                  Restore chat
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 text-(--chat-label)" />
                  Archive
                </>
              )}
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
    );
  };

  const handleDeleteAccount = () => {
    setIsConfirmDeleteOpen(true);
  };

  const executeDeleteAccount = async (confirmationText: string = "confirm") => {
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount(confirmationText);
      setIsConfirmDeleteOpen(false);
    } catch {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-20 bg-(--chat-overlay) transition md:hidden print:hidden",
          mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => {
          setMobileSidebarOpen(false);
          setSettingsMenuOpen(false);
          setActiveSubmenu(null);
        }}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col bg-(--chat-sidebar) transition-all duration-300 ease-in-out md:static print:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarOpen
            ? "md:translate-x-0 md:w-[260px] md:opacity-100"
            : "md:-translate-x-full md:w-0 md:opacity-0 md:overflow-hidden"
        )}
      >
        {/* â”€â”€ Top bar: logo + new-chat icon â”€â”€ */}
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
              setSettingsMenuOpen(false);
              setActiveSubmenu(null);
            }}
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* â”€â”€ Navigation links â”€â”€ */}
        <nav className="mt-2 flex flex-col gap-0.5 px-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer"
            onClick={() => {
              if (isShowingArchived) {
                setIsShowingArchived(false);
              }
              onNewChat();
            }}
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
              {isSearching ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-(--chat-brand)" />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-(--chat-text-muted)" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    setSearchResults(null);
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search chats & messages…"
                autoFocus
                className="w-full bg-transparent px-1 py-1 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint)"
              />
              <button
                type="button"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-(--chat-text-muted) transition hover:text-(--chat-text)"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
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
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-(--chat-text) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer"
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
            >
              <div className="flex items-center gap-3">
                <Search className="h-[18px] w-[18px] text-(--chat-text-muted)" />
                Search chats
              </div>
              <kbd className="hidden text-[10px] text-(--chat-text-faint) sm:inline-block rounded border border-white/10 px-1.5 py-0.5">
                ⌘K
              </kbd>
            </button>
          )}
          {/* ============================== */}
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer",
              isShowingArchived
                ? "bg-(--chat-sidebar-active) text-(--chat-text) font-medium"
                : "text-(--chat-text)"
            )}
            onClick={() => setIsShowingArchived(!isShowingArchived)}
          >
            <Archive className="h-[18px] w-[18px] text-(--chat-text-muted)" />
            {isShowingArchived ? "All conversations" : "Archived chats"}
          </button>
        </nav>

        {/* ── Your chats section ── */}
        <div className="mt-5 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-4 pb-2">
            <p className="text-[11px] font-medium text-(--chat-label)">
              {searchQuery.trim()
                ? "Search results"
                : isShowingArchived
                  ? "Archived chats"
                  : "Your chats"}
            </p>
            {searchQuery.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="text-[11px] text-(--chat-text-muted) hover:text-(--chat-text) transition hover:cursor-pointer"
              >
                Clear
              </button>
            ) : isShowingArchived ? (
              <button
                type="button"
                onClick={() => setIsShowingArchived(false)}
                className="text-[11px] text-(--chat-text-muted) hover:text-(--chat-text) transition flex items-center gap-1 hover:cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            ) : null}
          </div>
          <div className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-3">
            {searchQuery.trim() ? (
              isSearching && !searchResults ? (
                <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-(--chat-text-muted)">
                  <Loader2 className="h-4 w-4 animate-spin text-(--chat-brand)" />
                  Searching chats & messages…
                </div>
              ) : searchError ? (
                <div className="px-3 py-4 text-center text-xs text-(--chat-text-faint)">
                  {searchError}
                </div>
              ) : !searchResults || (searchResults.chats.length === 0 && searchResults.messages.length === 0) ? (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <Search className="mb-2 h-7 w-7 text-(--chat-text-faint) opacity-60" />
                  <p className="text-sm font-medium text-(--chat-text)">No results found</p>
                  <p className="mt-1 text-xs text-(--chat-text-faint)">
                    No chats or messages match &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Matching Conversations */}
                  {searchResults.chats.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-2 pb-1.5">
                        <span className="text-[11px] font-medium text-(--chat-label)">
                          Conversations
                        </span>
                        <span className="text-[10px] text-(--chat-text-faint)">
                          {searchResults.chats.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {searchResults.chats.map((chat) => (
                          <button
                            key={chat._id}
                            type="button"
                            onClick={() => {
                              onSelectChat(chat._id, undefined, chat.isArchived);
                              setMobileSidebarOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-(--chat-sidebar-active) hover:cursor-pointer group",
                              activeChatId === chat._id && "bg-(--chat-sidebar-active) text-(--chat-text) font-medium"
                            )}
                          >
                            <MessageCircle className="h-4 w-4 shrink-0 text-(--chat-text-muted)" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-medium text-(--chat-text)">
                                  <HighlightMatch text={chat.title} query={searchQuery} />
                                </span>
                                {chat.isArchived && (
                                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-400 border border-white/10 shrink-0">
                                    Archived
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-(--chat-text-faint)">
                                {formatDateLabel(chat.updatedAt)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Messages */}
                  {searchResults.messages.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-2 pb-1.5">
                        <span className="text-[11px] font-medium text-(--chat-label)">
                          Messages
                        </span>
                        <span className="text-[10px] text-(--chat-text-faint)">
                          {searchResults.messages.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {searchResults.messages.map((msg) => (
                          <button
                            key={msg._id}
                            type="button"
                            onClick={() => {
                              onSelectChat(msg.chatId, msg._id, msg.isArchived);
                              setMobileSidebarOpen(false);
                            }}
                            className="flex flex-col gap-1 rounded-lg border border-transparent p-2 text-left transition hover:border-(--chat-dropdown-border) hover:bg-(--chat-sidebar-active) hover:cursor-pointer group"
                          >
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-medium text-(--chat-text) truncate max-w-[130px]">
                                  {msg.chatTitle}
                                </span>
                                {msg.isArchived && (
                                  <span className="rounded bg-zinc-800/80 px-1 py-0.2 text-[9px] text-zinc-400 border border-white/10 shrink-0">
                                    Archived
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-(--chat-text-faint) shrink-0">
                                {formatDateLabel(msg.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="shrink-0 text-[10px] font-semibold text-(--chat-text-muted) uppercase tracking-wider mt-0.5">
                                {msg.role === "user" ? "You:" : "AI:"}
                              </span>
                              <p className="line-clamp-2 text-xs text-(--chat-text-secondary) leading-relaxed">
                                <HighlightMatch text={msg.contentSnippet} query={searchQuery} />
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : isLoadingChats || isBootstrapping ? (
              <div className="px-3 py-2 text-sm text-(--chat-text-faint)">
                Loading chats…
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="px-3 py-2 text-sm text-(--chat-text-faint)">
                {isShowingArchived
                  ? "No archived chats."
                  : "No conversations yet."}
              </div>
            ) : isShowingArchived ? (
              <div className="flex flex-col gap-0.5">
                {filteredChats.map((chat, index) =>
                  renderChatItem(chat, index, filteredChats.length)
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pinnedChats.length > 0 && (
                  <div>
                    <p className="px-2 pb-1.5 text-[11px] font-medium text-(--chat-label)">
                      Pinned
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {pinnedChats.map((chat, index) =>
                        renderChatItem(chat, index, filteredChats.length)
                      )}
                    </div>
                  </div>
                )}
                <div>
                  {pinnedChats.length > 0 && (
                    <p className="px-2 pb-1.5 text-[11px] font-medium text-(--chat-label)">
                      Recent
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {recentChats.map((chat, index) =>
                      renderChatItem(chat, index, filteredChats.length)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Bottom section â”€â”€ */}
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
              <div className="absolute bottom-full left-0 z-50 mb-1 w-full max-h-[calc(100dvh-120px)] overflow-y-auto rounded-md border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl md:max-h-none md:overflow-visible">
                {/* Direct Settings Link */}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer"
                  onClick={() => {
                    setActiveSubmenu(null);
                    setSettingsMenuOpen(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4 text-(--chat-label)" />
                  Settings & Data
                </button>
                <div className="my-1 border-t border-(--chat-dropdown-border)" />

                {/* You section */}
                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnter("you")}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) hover:cursor-pointer transition hover:bg-(--chat-dropdown-hover)",
                      activeSubmenu === "you" && "bg-(--chat-dropdown-hover) text-(--chat-text)"
                    )}
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === "you" ? null : "you"))
                    }
                    aria-expanded={activeSubmenu === "you"}
                  >
                    <span className="flex items-center gap-3">
                      <CircleUser className="h-4 w-4 text-(--chat-label)" />
                      You
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-[#666] transition-transform duration-200",
                        activeSubmenu === "you" && "rotate-90 md:rotate-0"
                      )}
                    />
                  </button>

                  {activeSubmenu === "you" && (
                    <div
                      className={cn(
                        // Mobile: inline accordion expansion
                        "w-full bg-(--chat-dropdown-hover)/40 py-1 my-0.5 space-y-0.5",
                        // Desktop: flyout submenu to the right
                        "md:absolute md:left-full md:-top-36 md:z-60 md:ml-1 md:w-50 md:space-y-0 md:bg-(--chat-dropdown) md:my-0 md:py-1.5 md:rounded-xl md:border md:border-(--chat-dropdown-border) md:shadow-2xl md:before:absolute md:before:-left-2 md:before:top-0 md:before:bottom-0 md:before:w-2"
                      )}
                    >
                      {/* Account */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          if (onOpenSettings) {
                            onOpenSettings();
                          }
                        }}
                      >
                        <User className="h-[16px] w-[16px] text-(--chat-label)" />
                        Account & Data
                      </button>

                      {/* Notifications */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          toast("Notifications settings coming soon");
                        }}
                      >
                        <Bell className="h-[16px] w-[16px] text-(--chat-label)" />
                        Notifications
                      </button>

                      {/* Privacy & Sessions */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          if (onOpenSettings) {
                            onOpenSettings();
                          }
                        }}
                      >
                        <ShieldCheck className="h-[16px] w-[16px] text-(--chat-label)" />
                        Sessions & Privacy
                      </button>

                      {/* Custom instructions */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          setIsInstructionsOpen(true);
                        }}
                      >
                        <SquarePen className="h-[16px] w-[16px] text-(--chat-label)" />
                        Custom instructions
                      </button>

                      {/* Change password */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          setIsChangePasswordOpen(true);
                        }}
                      >
                        <KeyRound className="h-[16px] w-[16px] text-(--chat-label)" />
                        Change password
                      </button>

                      {/* Divider before destructive actions */}
                      <div className="my-1 border-t border-(--chat-dropdown-border)" />

                      {/* Logout */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          onLogout();
                        }}
                      >
                        <LogOut className="h-[16px] w-[16px]" />
                        Log out
                      </button>

                      {/* Delete account */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer md:py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isDeletingAccount}
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          handleDeleteAccount();
                        }}
                      >
                        <Trash2 className="h-[16px] w-[16px]" />
                        {isDeletingAccount ? "Deleting..." : "Delete account"}
                      </button>


                    </div>
                  )}
                </div>
                {/* Customize selection */}
                <div className="my-1.5 border-t border-(--chat-dropdown-border)" />
                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnter("customize")}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) hover:cursor-pointer transition hover:bg-(--chat-dropdown-hover)",
                      activeSubmenu === "customize" && "bg-(--chat-dropdown-hover) text-(--chat-text)"
                    )}
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === "customize" ? null : "customize"))
                    }
                    aria-expanded={activeSubmenu === "customize"}
                  >
                    <span className="flex items-center gap-3">
                      <SlidersHorizontal className="h-4 w-4 text-(--chat-label)" />
                      Customize
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-[#666] transition-transform duration-200",
                        activeSubmenu === "customize" && "rotate-90 md:rotate-0"
                      )}
                    />
                  </button>

                  {activeSubmenu === "customize" && (
                    <div
                      className={cn(
                        // Mobile: inline accordion expansion
                        "w-full bg-(--chat-dropdown-hover)/40 py-1 my-0.5 space-y-0.5",
                        // Desktop: flyout submenu to the right
                        "md:absolute md:left-full md:-top-2 md:z-60 md:ml-1 md:w-40 md:space-y-0 md:bg-(--chat-dropdown) md:my-0 md:py-1.5 md:rounded-xl md:border md:border-(--chat-dropdown-border) md:shadow-2xl md:before:absolute md:before:-left-2 md:before:top-0 md:before:bottom-0 md:before:w-2"
                      )}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          toast("Skill settings coming soon");
                        }}
                      >
                        <GraduationCap className="h-[16px] w-[16px] text-(--chat-label)" />
                        Skill
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          onOpenMcpSettings();
                        }}
                      >
                        <Plug className="h-[16px] w-[16px] text-(--chat-label)" />
                        Connectors
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          toast("Plugins coming soon");
                        }}
                      >
                        <Cog className="h-[16px] w-[16px] text-(--chat-label)" />
                        Plugins
                      </button>
                    </div>
                  )}
                </div>

                {/* Language selection */}
                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnter("language")}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) hover:cursor-pointer transition hover:bg-(--chat-dropdown-hover)",
                      activeSubmenu === "language" && "bg-(--chat-dropdown-hover) text-(--chat-text)"
                    )}
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === "language" ? null : "language"))
                    }
                    aria-expanded={activeSubmenu === "language"}
                  >
                    <span className="flex items-center gap-3">
                      <Languages className="h-[18px] w-[18px] text-(--chat-label)" />
                      Language
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-[#666] transition-transform duration-200",
                        activeSubmenu === "language" && "rotate-90 md:rotate-0"
                      )}
                    />
                  </button>

                  {activeSubmenu === "language" && (
                    <div
                      className={cn(
                        // Mobile: inline accordion expansion
                        "w-full bg-(--chat-dropdown-hover)/40 py-1 my-0.5 space-y-0.5",
                        // Desktop: flyout submenu to the right
                        "md:absolute md:left-full md:-top-2 md:z-60 md:ml-1 md:w-50 md:space-y-0 md:bg-(--chat-dropdown) md:my-0 md:py-1.5 md:rounded-xl md:border md:border-(--chat-dropdown-border) md:shadow-2xl md:before:absolute md:before:-left-2 md:before:top-0 md:before:bottom-0 md:before:w-2"
                      )}
                    >
                      {[
                        { id: "english", label: "English" },
                        { id: "hinglish", label: "Hinglish (Hindi + Eng)" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                          onClick={() => {
                            setLanguage(opt.id as "english" | "hinglish");
                            setActiveSubmenu(null);
                            setSettingsMenuOpen(false);
                          }}
                        >
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full border",
                              language === opt.id
                                ? "border-(--chat-text) bg-(--chat-text)"
                                : "border-[#666] bg-transparent"
                            )}
                          />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                </div>


                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnter("theme")}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) hover:cursor-pointer transition hover:bg-(--chat-dropdown-hover)",
                      activeSubmenu === "theme" && "bg-(--chat-dropdown-hover) text-(--chat-text)"
                    )}
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === "theme" ? null : "theme"))
                    }
                    aria-expanded={activeSubmenu === "theme"}
                  >
                    <span className="flex items-center gap-3">
                      <SunMoon className="h-[18px] w-[18px] text-(--chat-label)" />
                      Theme
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-[#666] transition-transform duration-200",
                        activeSubmenu === "theme" && "rotate-90 md:rotate-0"
                      )}
                    />
                  </button>

                  {/* Theme submenu */}
                  {activeSubmenu === "theme" && (
                    <div
                      className={cn(
                        // Mobile: inline accordion expansion
                        "w-full bg-(--chat-dropdown-hover)/40 py-1 my-0.5 space-y-0.5",
                        // Desktop: flyout submenu to the right
                        "md:absolute md:left-full md:-top-2 md:z-60 md:ml-1 md:w-40 md:space-y-0 md:bg-(--chat-dropdown) md:my-0 md:py-1.5 md:rounded-xl md:border md:border-(--chat-dropdown-border) md:shadow-2xl md:before:absolute md:before:-left-2 md:before:top-0 md:before:bottom-0 md:before:w-2"
                      )}
                    >
                      {[
                        { id: "light", label: "Light", icon: Sun },
                        { id: "dark", label: "Dark", icon: Moon },
                        { id: "system", label: "System", icon: Monitor },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                          onClick={() => {
                            setTheme(opt.id);
                            setActiveSubmenu(null);
                            setSettingsMenuOpen(false);
                          }}
                        >
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full border",
                              theme === opt.id
                                ? "border-(--chat-text) bg-(--chat-text)"
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
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                  onClick={onOpenDocuments}
                >
                  <Library className="h-[18px] w-[18px] text-(--chat-text-muted)" />
                  Documents
                </button>


                {/* More section */}
                <div
                  className="relative"
                  onMouseEnter={() => handleMouseEnter("more")}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-sm text-(--chat-text-secondary) hover:cursor-pointer transition hover:bg-(--chat-dropdown-hover)",
                      activeSubmenu === "more" && "bg-(--chat-dropdown-hover) text-(--chat-text)"
                    )}
                    onClick={() =>
                      setActiveSubmenu((prev) => (prev === "more" ? null : "more"))
                    }
                    aria-expanded={activeSubmenu === "more"}
                  >
                    <span className="flex items-center gap-3">
                      <MoreHorizontal className="h-4 w-4 text-(--chat-label)" />
                      More
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-[#666] transition-transform duration-200",
                        activeSubmenu === "more" && "rotate-90 md:rotate-0"
                      )}
                    />
                  </button>

                  {activeSubmenu === "more" && (
                    <div
                      className={cn(
                        // Mobile: inline accordion expansion
                        "w-full bg-(--chat-dropdown-hover)/40 py-1 my-0.5 space-y-0.5",
                        // Desktop: flyout submenu to the right
                        "md:absolute md:left-full md:-top-40 md:z-60 md:ml-1 md:w-50 md:space-y-0 md:bg-(--chat-dropdown) md:my-0 md:py-1.5 md:rounded-xl md:border md:border-(--chat-dropdown-border) md:shadow-2xl md:before:absolute md:before:-left-2 md:before:top-0 md:before:bottom-0 md:before:w-2"
                      )}
                    >
                      <Link
                        href="/about"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                        }}
                      >
                        <Info className="h-[16px] w-[16px] text-(--chat-label)" />
                        About Codebhaiya
                      </Link>
                      <Link
                        href="/terms"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                        }}
                      >
                        <FileText className="h-[16px] w-[16px] text-(--chat-label)" />
                        Terms of service
                      </Link>
                      <Link
                        href="/privacy"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                        }}
                      >
                        <Shield className="h-[16px] w-[16px] text-(--chat-label)" />
                        Privacy policy
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                        }}
                      >
                        <span className="flex items-center gap-1 text-(--chat-label)">
                          <Megaphone className="h-[16px] w-[16px]" />
                        </span>
                        Feedback
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                        }}
                      >
                        <span className="flex items-center gap-1 text-(--chat-label)">
                          <AlertTriangle className="h-[16px] w-[16px]" />
                        </span>
                        Report a bug
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-sidebar-text-hover) hover:cursor-pointer",
                settingsMenuOpen && "bg-white/5"
              )}
              onClick={() => {
                if (settingsMenuOpen) {
                  setActiveSubmenu(null);
                }
                setSettingsMenuOpen(!settingsMenuOpen);
              }}
            >
              <Settings className="h-[18px] w-[18px] text-(--chat-label)" />
              Settings
            </button>

          </div>

          <div
            ref={usageRef}
            className="relative"
            onMouseEnter={() => setIsUsageOpen(true)}
            onMouseLeave={() => setIsUsageOpen(false)}
          >
            {isUsageOpen && (
              <section
                id="usage-popover"
                role="dialog"
                aria-label="Daily and monthly usage"
                className="absolute bottom-full left-0 z-50 mb-2 max-h-[min(70dvh,30rem)] w-[292px] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) p-3.5 text-(--chat-text) shadow-2xl"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Usage &amp; limits</h2>
                    <p className="mt-0.5 text-[10px] text-(--chat-text-faint)">Daily activity · Monthly quota · UTC</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-(--chat-text-muted) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)"
                    onClick={() => setIsUsageOpen(false)}
                    aria-label="Close usage details"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isUsageLoading && !usageSummary ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-(--chat-text-muted)" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading usage…
                  </div>
                ) : usageError && !usageSummary ? (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2.5 text-xs text-red-400" role="alert">{usageError}</p>
                ) : usageSummary ? (
                  <div className="space-y-4">
                    {usageError && (
                      <p className="text-[10px] text-amber-400" role="status">Showing the last loaded usage; refresh failed.</p>
                    )}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--chat-text-faint)">Today</h3>
                        <span className="text-[10px] tabular-nums text-(--chat-text-faint)">
                          {new Date(`${usageSummary.daily.period}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}
                        </span>
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            ["Messages", usageSummary.daily.usage.messages],
                            ["Files uploaded", usageSummary.daily.usage.uploads],
                            ["Images generated", usageSummary.daily.usage.imageGenerations],
                            ["Document analyses", usageSummary.daily.usage.expensiveModelCalls],
                          ].map(([label, value]) => (
                            <tr key={label} className="border-t border-(--chat-dropdown-border)/70 first:border-0">
                              <th scope="row" className="py-1.5 text-left font-normal text-(--chat-text-secondary)">{label}</th>
                              <td className="py-1.5 text-right font-medium tabular-nums text-(--chat-text)">{Number(value).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border-t border-(--chat-dropdown-border) pt-3">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-(--chat-text-faint)">This month</h3>
                        <span className="text-[10px] text-(--chat-text-faint)">remaining quota</span>
                      </div>
                      <div className="space-y-3">
                        <UsageQuotaLine label="Messages" used={usageSummary.usage.messages} limit={usageSummary.quotas.messages} />
                        <UsageQuotaLine
                          label="File uploads"
                          used={usageSummary.usage.uploads}
                          limit={usageSummary.quotas.uploads}
                          detail={`${formatUsageBytes(usageSummary.usage.uploadBytes)} used · ${formatUsageBytes(Math.max(0, usageSummary.quotas.uploadBytes - usageSummary.usage.uploadBytes))} storage left`}
                        />
                        <UsageQuotaLine label="Images" used={usageSummary.usage.imageGenerations} limit={usageSummary.quotas.imageGenerations} />
                        <UsageQuotaLine label="Document analyses" used={usageSummary.usage.expensiveModelCalls} limit={usageSummary.quotas.expensiveModelCalls} />
                      </div>
                    </div>

                    <p className="border-t border-(--chat-dropdown-border) pt-2 text-[10px] leading-relaxed text-(--chat-text-faint)">
                      Monthly limits refresh on the first day of each month. Daily activity resets at midnight UTC.
                    </p>
                  </div>
                ) : null}
              </section>
            )}
            <button
              type="button"
              aria-expanded={isUsageOpen}
              aria-controls="usage-popover"
              onClick={() => setIsUsageOpen(true)}
              onFocus={() => setIsUsageOpen(true)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-sidebar-text-hover) hover:text-(--chat-text)",
                isUsageOpen && "bg-(--chat-sidebar-text-hover) text-(--chat-text)"
              )}
            >
              <Activity className="h-[18px] w-[18px] text-(--chat-label)" />
              Usage &amp; limits
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

      <DeleteAccountModal
        isOpen={isConfirmDeleteOpen}
        isDeleting={isDeletingAccount}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={executeDeleteAccount}
      />

      <CustomInstructionsModal
        isOpen={isInstructionsOpen}
        initialInstructions={user?.preferences?.systemInstructions ?? ""}
        onClose={() => setIsInstructionsOpen(false)}
        onSave={onSaveSystemInstructions}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onChangePassword={onChangePassword}
      />
    </>
  );
});
