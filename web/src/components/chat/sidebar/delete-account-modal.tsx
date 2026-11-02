"use client";

interface DeleteAccountModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4">
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
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
