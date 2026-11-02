"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  onChangePassword,
}: ChangePasswordModalProps) {
  const [cpCurrentPassword, setCpCurrentPassword] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpLoading, setCpLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setCpError(null);

    if (!cpCurrentPassword || !cpNewPassword || !cpConfirmPassword) {
      setCpError("All fields are required");
      return;
    }
    if (cpNewPassword.length < 8) {
      setCpError("New password must be at least 8 characters");
      return;
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError("New passwords do not match");
      return;
    }

    setCpLoading(true);
    try {
      await onChangePassword(cpCurrentPassword, cpNewPassword);
      toast.success("Password changed successfully");
      onClose();
    } catch (err: unknown) {
      setCpError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setCpLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold text-(--chat-text)">
          Change Password
        </h3>

        {cpError && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {cpError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Current password"
            value={cpCurrentPassword}
            onChange={(e) => setCpCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2.5 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint) focus:ring-1 focus:ring-(--chat-focus-ring)"
            autoFocus
          />
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={cpNewPassword}
            onChange={(e) => setCpNewPassword(e.target.value)}
            className="w-full rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2.5 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint) focus:ring-1 focus:ring-(--chat-focus-ring)"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={cpConfirmPassword}
            onChange={(e) => setCpConfirmPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !cpLoading) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            className="w-full rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2.5 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint) focus:ring-1 focus:ring-(--chat-focus-ring)"
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-sidebar-hover) disabled:opacity-50"
            onClick={onClose}
            disabled={cpLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-(--chat-text) transition hover:bg-white/20 disabled:opacity-50"
            disabled={cpLoading}
            onClick={() => void handleSubmit()}
          >
            {cpLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
