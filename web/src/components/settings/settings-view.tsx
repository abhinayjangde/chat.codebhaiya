"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  Clock,
  Database,
  Download,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  RefreshCw,
  Shield,
  ShieldAlert,
  Smartphone,
  SlidersHorizontal,
  SquarePen,
  Tablet,
  Trash2,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { apiClient } from "@/lib/api";
import {
  clearStoredSession,
  readStoredTokens,
  readStoredUser,
  writeStoredUser,
} from "@/lib/storage";
import type { AuthTokens, UserProfile, UserSession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "@/components/chat/sidebar/change-password-modal";
import { CustomInstructionsModal } from "@/components/chat/sidebar/custom-instructions-modal";
import { DeleteAccountModal } from "@/components/chat/sidebar/delete-account-modal";
import { ProfileAvatar } from "@/components/profile-avatar";

interface SettingsViewProps {
  embedded?: boolean;
  onBack?: () => void;
  onAllChatsDeleted?: () => void;
}

export function SettingsView({
  embedded = false,
  onBack,
  onAllChatsDeleted,
}: SettingsViewProps) {
  const router = useRouter();
  const [tokens, setTokens] = useState<AuthTokens | null>(() => readStoredTokens());
  const [user, setUser] = useState<UserProfile | null>(() => readStoredUser());
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [activeTab, setActiveTab] = useState<"data" | "sessions" | "account">("data");

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAllOthers, setRevokingAllOthers] = useState(false);

  // Data state
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Account modals state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const handleProfilePictureSelected = async (file: File | undefined) => {
    if (!file || !tokens?.accessToken) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile pictures must be 5 MB or smaller.");
      return;
    }

    setIsUploadingProfilePicture(true);
    try {
      const result = await apiClient.uploadProfilePicture(file, tokens.accessToken);
      setUser((current) => {
        if (!current) return current;
        const updatedUser = { ...current, profilePictureUpdatedAt: result.profilePictureUpdatedAt };
        writeStoredUser(updatedUser);
        return updatedUser;
      });
      window.dispatchEvent(new Event("profile-picture-updated"));
      toast.success("Profile picture updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile picture upload failed.");
    } finally {
      setIsUploadingProfilePicture(false);
      if (profilePictureInputRef.current) profilePictureInputRef.current.value = "";
    }
  };

  // Load user details & sessions
  const loadUser = useCallback(async () => {
    if (!tokens?.accessToken) return;
    try {
      const data = await apiClient.me(tokens.accessToken);
      if (data?.user) {
        setUser(data.user);
        writeStoredUser(data.user);
      }
    } catch {
      // ignore
    }
  }, [tokens]);

  const loadSessions = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoadingSessions(true);
    try {
      const data = await apiClient.listSessions(tokens.accessToken);
      setSessions(data.sessions || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, [tokens]);

  useEffect(() => {
    if (!tokens) {
      router.replace("/login");
      return;
    }
    void loadUser();
    void loadSessions();
  }, [tokens, router, loadUser, loadSessions]);

  // Handle Export All Chats
  const handleExportAllChats = async () => {
    if (!tokens?.accessToken) return;
    setIsExporting(true);
    try {
      const exportData = await apiClient.exportAllChats(tokens.accessToken);
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `chat-history-export-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(
        `Export complete! ${exportData.totalChats ?? exportData.chats?.length ?? 0} chats downloaded.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export chat history");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Delete All Chat History
  const handleDeleteAllChats = async () => {
    if (!tokens?.accessToken) return;
    setIsDeletingHistory(true);
    try {
      const res = await apiClient.deleteAllChats(tokens.accessToken);
      toast.success(res.message || "All chat history has been deleted");
      setIsDeleteDialogOpen(false);
      onAllChatsDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete chat history");
    } finally {
      setIsDeletingHistory(false);
    }
  };

  // Handle Revoke Single Session
  const handleRevokeSession = async (session: UserSession) => {
    if (!tokens?.accessToken) return;
    setRevokingSessionId(session.sessionId);
    try {
      const res = await apiClient.revokeSession(session.sessionId, tokens.accessToken);
      if (res.isCurrent || session.isCurrent) {
        toast.success("Current session revoked. Logging out...");
        clearStoredSession();
        router.replace("/login");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.sessionId !== session.sessionId));
      toast.success("Session revoked successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Handle Revoke All Other Sessions
  const handleRevokeAllOthers = async () => {
    if (!tokens?.accessToken) return;
    setRevokingAllOthers(true);
    try {
      const res = await apiClient.revokeOtherSessions(tokens.accessToken);
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success(
        res.revokedCount
          ? `Revoked ${res.revokedCount} other active session(s)`
          : "All other sessions have been revoked"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setRevokingAllOthers(false);
    }
  };

  // Handle Delete Account
  const handleConfirmDeleteAccount = async (confirmationText: string = "confirm") => {
    if (!tokens?.accessToken) return;
    setIsDeletingAccount(true);
    try {
      const result = await apiClient.deleteAccount(tokens.accessToken, confirmationText);
      toast.success(
        result?.message ||
          "Account scheduled for deletion. You have 30 days to recover your account."
      );
      clearStoredSession();
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      throw err;
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Helpers for session presentation
  const getDeviceIcon = (device?: string) => {
    const d = (device || "").toLowerCase();
    if (d === "mobile") return <Smartphone className="h-5 w-5" />;
    if (d === "tablet") return <Tablet className="h-5 w-5" />;
    return <Laptop className="h-5 w-5" />;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Just now";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-(--chat-bg) text-(--chat-text)">
      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-(--chat-dropdown-border) bg-(--chat-surface)/50 px-4 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          {embedded ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer"
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/chat"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-3 text-xs font-medium text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Chat
            </Link>
          )}
          <div>
            <h1 className="text-base font-semibold leading-tight text-(--chat-text)">
              Settings
            </h1>
            <p className="text-xs text-(--chat-text-muted)">
              Manage your settings, data, and active sessions
            </p>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="flex shrink-0 flex-row border-b border-(--chat-dropdown-border) bg-(--chat-surface)/30 p-2 md:w-64 md:flex-col md:border-b-0 md:border-r md:p-4 gap-1">
         
           <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={cn(
              "flex flex-1 md:flex-none items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition hover:cursor-pointer",
              activeTab === "account"
                ? "bg-(--chat-brand)/10 text-(--chat-brand) font-semibold"
                : "text-(--chat-text-secondary) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)"
            )}
          >
            <User className="h-4 w-4 shrink-0" />
            <span>Account & Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={cn(
              "flex flex-1 md:flex-none items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition hover:cursor-pointer",
              activeTab === "sessions"
                ? "bg-(--chat-brand)/10 text-(--chat-brand) font-semibold"
                : "text-(--chat-text-secondary) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)"
            )}
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 shrink-0" />
              <span>Active Sessions</span>
            </div>
            {sessions.length > 0 && (
              <span className="hidden md:inline-flex h-5 items-center justify-center rounded-full bg-(--chat-surface) px-2 text-[10px] text-(--chat-text-muted)">
                {sessions.length}
              </span>
            )}
          </button>

         
           <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={cn(
              "flex flex-1 md:flex-none items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition hover:cursor-pointer",
              activeTab === "data"
                ? "bg-(--chat-brand)/10 text-(--chat-brand) font-semibold"
                : "text-(--chat-text-secondary) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)"
            )}
          >
            <Database className="h-4 w-4 shrink-0" />
            <span>Data Controls</span>
          </button>
        </nav>

        {/* Tab Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* ──────── TAB 1: DATA CONTROLS ──────── */}
            {activeTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-(--chat-text)">
                    Data Controls & Export
                  </h2>
                  <p className="text-xs text-(--chat-text-muted)">
                    You own your conversations. Export your complete chat archive or clear history at any time.
                  </p>
                </div>

                {/* Export All Chats Card */}
                <div className="rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--chat-brand)/10 text-(--chat-brand)">
                        <Download className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-(--chat-text)">
                          Export All Chat History
                        </h3>
                        <p className="text-xs text-(--chat-text-muted) leading-relaxed">
                          Download a complete, machine-readable JSON archive of all your conversations,
                          user prompts, AI responses, attachments, and timestamps.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportAllChats}
                      disabled={isExporting}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-(--chat-brand) px-4 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50 hover:cursor-pointer"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Download JSON Export
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Danger Zone: Delete Chat History & Account */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-(--chat-text-muted)">
                      Danger Zone
                    </h3>
                  </div>

                  {/* Delete Chat History Card */}
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <h4 className="text-sm font-semibold text-(--chat-text)">
                            Delete Chat History
                          </h4>
                        </div>
                        <p className="text-xs text-(--chat-text-muted) leading-relaxed">
                          Permanently delete all conversations and message records. Your account,
                          uploaded Document Library files, and custom preferences will remain untouched.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 text-xs font-medium text-red-500 transition hover:bg-red-500/20 hover:cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear All History
                      </button>
                    </div>
                  </div>

                  {/* Delete Account Card */}
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          <h4 className="text-sm font-semibold text-(--chat-text)">
                            Delete Entire Account
                          </h4>
                        </div>
                        <p className="text-xs text-(--chat-text-muted) leading-relaxed">
                          Deactivate your account and schedule complete data purge. You have a 30-day
                          recovery window to reactivate if you change your mind.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDeleteAccountOpen(true)}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-medium text-white transition hover:bg-red-700 hover:cursor-pointer"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────── TAB 2: ACTIVE SESSIONS ──────── */}
            {activeTab === "sessions" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-(--chat-text)">
                      Active Sessions & Devices
                    </h2>
                    <p className="text-xs text-(--chat-text-muted)">
                      Review all devices and browsers currently signed in to your account.
                      Revoke any unrecognized or obsolete sessions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadSessions()}
                      disabled={loadingSessions}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-3 text-xs text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer disabled:opacity-50"
                      title="Refresh session list"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", loadingSessions && "animate-spin")} />
                      Refresh
                    </button>
                    {hasOtherSessions && (
                      <button
                        type="button"
                        onClick={handleRevokeAllOthers}
                        disabled={revokingAllOthers}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-500 transition hover:bg-red-500/20 hover:cursor-pointer disabled:opacity-50"
                      >
                        {revokingAllOthers ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LogOut className="h-3.5 w-3.5" />
                        )}
                        Revoke All Other Sessions
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Cards List */}
                {loadingSessions && sessions.length === 0 ? (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface)">
                    <Loader2 className="h-6 w-6 animate-spin text-(--chat-text-muted)" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-8 text-center text-xs text-(--chat-text-muted)">
                    No active sessions found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.sessionId}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border p-4 transition-all gap-4",
                          session.isCurrent
                            ? "border-emerald-500/30 bg-emerald-500/5 shadow-xs"
                            : "border-(--chat-dropdown-border) bg-(--chat-surface)"
                        )}
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                              session.isCurrent
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-(--chat-dropdown-hover) text-(--chat-text-secondary)"
                            )}
                          >
                            {getDeviceIcon(session.device)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-(--chat-text)">
                                {session.browser || "Web Browser"} on {session.os || "Device"}
                              </span>
                              {session.isCurrent && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--chat-text-muted)">
                              {session.ipAddress && (
                                <span>IP: {session.ipAddress}</span>
                              )}
                              <span>
                                Last active: {formatDate(session.lastActiveAt || session.updatedAt)}
                              </span>
                              <span>
                                Signed in: {formatDate(session.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(session)}
                            disabled={revokingSessionId === session.sessionId}
                            className={cn(
                              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition hover:cursor-pointer disabled:opacity-50",
                              session.isCurrent
                                ? "border border-(--chat-dropdown-border) text-(--chat-text-secondary) hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                : "border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            )}
                          >
                            {revokingSessionId === session.sessionId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <LogOut className="h-3 w-3" />
                            )}
                            {session.isCurrent ? "Log out this device" : "Revoke"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB 3: ACCOUNT & SECURITY ──────── */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-(--chat-text)">
                    Account & Security
                  </h2>
                  <p className="text-xs text-(--chat-text-muted)">
                    Manage your credentials, custom system instructions, and account details.
                  </p>
                </div>

                {/* Profile Card */}
                <div className="rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-5 space-y-4">
                  <div className="flex items-center gap-3.5">
                    <ProfileAvatar
                      accessToken={tokens?.accessToken}
                      updatedAt={user?.profilePictureUpdatedAt}
                      name={user?.name}
                      className="h-12 w-12 bg-(--chat-brand)/10 text-lg font-semibold text-(--chat-brand)"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-(--chat-text)">{user?.name || "Codebhaiya User"}</h3>
                      <p className="text-xs text-(--chat-text-muted)">{user?.email}</p>
                      <input
                        ref={profilePictureInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        aria-label="Choose a profile picture"
                        onChange={(event) => void handleProfilePictureSelected(event.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={() => profilePictureInputRef.current?.click()}
                        disabled={isUploadingProfilePicture}
                        className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-lg border border-(--chat-dropdown-border) px-2.5 text-[11px] font-medium text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) disabled:cursor-wait disabled:opacity-60"
                      >
                        {isUploadingProfilePicture ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                        {isUploadingProfilePicture ? "Uploading…" : "Change picture"}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-(--chat-text-muted)">JPEG, PNG, or WebP · up to 5 MB</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface)/50 p-3">
                      <span className="text-(--chat-text-muted) block mb-0.5">Account Status</span>
                      <span className="font-medium text-emerald-500 capitalize">
                        {user?.status || "Active"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface)/50 p-3">
                      <span className="text-(--chat-text-muted) block mb-0.5">Preferred Theme</span>
                      <span className="font-medium text-(--chat-text) capitalize">
                        {user?.preferences?.theme || "System"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Change Password Trigger */}
                  <div className="flex flex-col justify-between rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-5 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-(--chat-brand)" />
                        <h4 className="text-sm font-semibold text-(--chat-text)">
                          Password & Credentials
                        </h4>
                      </div>
                      <p className="text-xs text-(--chat-text-muted) leading-relaxed">
                        Update your account password regularly to ensure your conversations stay secure.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangePasswordOpen(true)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-4 text-xs font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                    >
                      Change Password
                    </button>
                  </div>

                  {/* Custom Instructions Trigger */}
                  <div className="flex flex-col justify-between rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-5 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SquarePen className="h-4 w-4 text-(--chat-brand)" />
                        <h4 className="text-sm font-semibold text-(--chat-text)">
                          Custom Instructions
                        </h4>
                      </div>
                      <p className="text-xs text-(--chat-text-muted) leading-relaxed">
                        Set system instructions to customize how the AI assistant responds to your queries.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsInstructionsOpen(true)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-4 text-xs font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                    >
                      Edit Instructions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ──────── MODAL: CONFIRM DELETE CHAT HISTORY ──────── */}
      {isDeleteDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-red-500/20 bg-(--chat-surface) p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => !isDeletingHistory && setIsDeleteDialogOpen(false)}
              disabled={isDeletingHistory}
              aria-label="Close dialog"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) disabled:opacity-40 hover:cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-500">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-(--chat-text)">
                  Clear All Chat History?
                </h3>
                <p className="text-xs text-red-400 font-medium">
                  Irreversible Action · All Chats Will Be Erased
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200 space-y-1">
              <p className="font-semibold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This will delete all conversations
              </p>
              <p className="leading-relaxed text-red-200/90">
                All your chats, prompts, and assistant replies will be permanently deleted from our servers.
                Your uploaded documents in the Document Library will not be deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeletingHistory}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-4 text-xs font-medium text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllChats}
                disabled={isDeletingHistory}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-medium text-white transition hover:bg-red-700 hover:cursor-pointer disabled:opacity-50"
              >
                {isDeletingHistory ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Yes, Delete All Chats
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── MODALS: PASSWORD, INSTRUCTIONS, ACCOUNT DELETION ──────── */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onChangePassword={async (curr, next) => {
          if (!tokens?.accessToken) return;
          await apiClient.changePassword(curr, next, tokens.accessToken);
        }}
      />

      <CustomInstructionsModal
        isOpen={isInstructionsOpen}
        initialInstructions={user?.preferences?.systemInstructions || ""}
        onClose={() => setIsInstructionsOpen(false)}
        onSave={async (instructions) => {
          if (!tokens?.accessToken) return;
          const data = await apiClient.updatePreferences(instructions, tokens.accessToken);
          setUser(data.user);
          writeStoredUser(data.user);
        }}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        isDeleting={isDeletingAccount}
        onClose={() => setIsDeleteAccountOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
      />
    </div>
  );
}
