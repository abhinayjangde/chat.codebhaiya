
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
  Megaphone,
  User,
  X,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, memo } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { ChatSummary, UserProfile } from "@/lib/types";
import { shortTitle } from "@/lib/chat-utils";
import { ExternalLink } from "lucide-react";
import { ChangePasswordModal } from "./sidebar/change-password-modal";
import { CustomInstructionsModal } from "./sidebar/custom-instructions-modal";
import { DeleteAccountModal } from "./sidebar/delete-account-modal";

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onOpenDocuments: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDownloadPdf: (chatId: string) => void;
  onDeleteAccount: () => Promise<void>;
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
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
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

  const executeDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount();
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
                placeholder="Search chatsâ€¦"
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

        {/* â”€â”€ Your chats section â”€â”€ */}
        <div className="mt-5 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-4 pb-2">
            <p className="text-[11px] font-medium text-(--chat-label)">
              {isShowingArchived ? "Archived chats" : "Your chats"}
            </p>
            {isShowingArchived && (
              <button
                type="button"
                onClick={() => setIsShowingArchived(false)}
                className="text-[11px] text-(--chat-text-muted) hover:text-(--chat-text) transition flex items-center gap-1 hover:cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            )}
          </div>
          <div className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-3">
            {isLoadingChats || isBootstrapping ? (
              <div className="px-3 py-2 text-sm text-(--chat-text-faint)">
                Loading chatsâ€¦
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="px-3 py-2 text-sm text-(--chat-text-faint)">
                {searchQuery.trim()
                  ? "No matching chats."
                  : isShowingArchived
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
                          toast("Account settings coming soon");
                        }}
                      >
                        <User className="h-[16px] w-[16px] text-(--chat-label)" />
                        Account
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

                      {/* Privacy */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer md:py-2.5"
                        onClick={() => {
                          setActiveSubmenu(null);
                          setSettingsMenuOpen(false);
                          toast("Privacy settings coming soon");
                        }}
                      >
                        <ShieldCheck className="h-[16px] w-[16px] text-(--chat-label)" />
                        Privacy
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
