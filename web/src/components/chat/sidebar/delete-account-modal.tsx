"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Loader2, ShieldAlert, X } from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (confirmationText: string) => Promise<void> | void;
}

export function DeleteAccountModal(props: DeleteAccountModalProps) {
  if (!props.isOpen) return null;
  return <DeleteAccountModalContent {...props} />;
}

function DeleteAccountModalContent({
  isDeleting,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onClose]);

  const isConfirmed = confirmText.trim().toLowerCase() === "confirm";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed && !isDeleting) {
      void onConfirm(confirmText.trim().toLowerCase());
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/20 bg-(--chat-surface) p-6 shadow-2xl">
        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-(--chat-text-secondary) transition hover:bg-(--chat-sidebar-hover) hover:text-(--chat-text) disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with warning badge */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3
              id="delete-account-title"
              className="text-lg font-semibold text-(--chat-text)"
            >
              Delete Account
            </h3>
            <p className="text-xs text-red-400 font-medium">
              Dangerous Action · Deactivation & Scheduled Deletion
            </p>
          </div>
        </div>

        {/* Danger explanation box */}
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>You will lose all your data</span>
          </div>
          <p className="leading-relaxed text-red-200/90">
            This action will mark your account for permanent deletion. You will lose all your{" "}
            <strong className="text-white font-medium">chats</strong>,{" "}
            <strong className="text-white font-medium">conversations</strong>,{" "}
            <strong className="text-white font-medium">uploaded documents</strong>, custom instructions, and preferences.
          </p>
        </div>

        {/* 30-Day Recovery Period notice */}
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-amber-300">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Immediate Deactivation & 30-Day Recovery Period</span>
          </div>
          <p className="leading-relaxed text-amber-200/90">
            You will <strong className="text-white font-medium">not be able to access your account now</strong>. After{" "}
            <strong className="text-white font-medium">30 days</strong>, we will permanently delete all your data from our database.
          </p>
          <p className="mt-2 text-amber-300 font-medium">
            💡 Changed your mind? You can recover your account anytime within 30 days simply by signing back in.
          </p>
        </div>

        {/* Text confirmation prompt */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-(--chat-text-secondary)">
              To confirm this action, please type{" "}
              <span className="rounded border border-red-500/40 bg-red-950/40 px-1.5 py-0.5 font-mono text-xs font-semibold text-red-400">
                confirm
              </span>{" "}
              below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "confirm" to proceed'
              disabled={isDeleting}
              autoFocus
              className="w-full rounded-lg border border-(--chat-composer-border) bg-(--chat-bg) px-3 py-2 text-sm text-(--chat-text) placeholder:text-(--chat-text-secondary)/60 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50"
            />
            {confirmText && (
              <p
                className={`mt-1.5 text-xs ${
                  isConfirmed ? "text-emerald-400 font-medium" : "text-red-400"
                }`}
              >
                {isConfirmed
                  ? "✓ Confirmation verified. You can now delete the account."
                  : 'Text must exactly match "confirm"'}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-sidebar-hover) disabled:opacity-50"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!isConfirmed || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                "Delete My Account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
