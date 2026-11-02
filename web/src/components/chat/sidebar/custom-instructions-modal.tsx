"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface CustomInstructionsModalProps {
  isOpen: boolean;
  initialInstructions: string;
  onClose: () => void;
  onSave: (instructions: string) => Promise<void>;
}

export function CustomInstructionsModal({
  isOpen,
  initialInstructions,
  onClose,
  onSave,
}: CustomInstructionsModalProps) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstructions(initialInstructions);
      setError(null);
    }
  }, [isOpen, initialInstructions]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSave(instructions);
      toast.success("Custom instructions saved");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save instructions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-semibold text-(--chat-text)">
          Custom instructions
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-(--chat-text-secondary)">
          Tell Codebhaiya how you want it to respond. These instructions apply to your future chats.
        </p>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          maxLength={4000}
          rows={7}
          placeholder="Example: Explain code step by step and use TypeScript examples."
          className="w-full resize-y rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2.5 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint) focus:ring-1 focus:ring-(--chat-focus-ring)"
          autoFocus
        />
        <p className="mt-1 text-right text-xs text-(--chat-text-faint)">
          {instructions.length}/4000
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-sidebar-hover) disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-(--chat-text) transition hover:bg-white/20 disabled:opacity-50"
            disabled={loading}
            onClick={() => void handleSave()}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
