"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bug, Check, Lightbulb, Sparkles, Star, X } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

export type FeedbackType = "feedback" | "bug_report" | "feature_request";

interface FeedbackModalProps {
  isOpen: boolean;
  initialType?: FeedbackType;
  chatId?: string | null;
  userEmail?: string;
  accessToken?: string;
  onClose: () => void;
}

const TYPE_CONFIG: Record<
  FeedbackType,
  { label: string; icon: typeof Lightbulb; placeholder: string; titlePlaceholder: string }
> = {
  feedback: {
    label: "Feedback",
    icon: Lightbulb,
    placeholder: "What's on your mind? Tell us what you like or how we can make Codebhaiya better...",
    titlePlaceholder: "Brief summary (optional)",
  },
  bug_report: {
    label: "Report Bug",
    icon: Bug,
    placeholder: "What went wrong? Please describe what happened and steps to reproduce the issue...",
    titlePlaceholder: "Bug title (e.g., Code block overflows on mobile)",
  },
  feature_request: {
    label: "Feature Idea",
    icon: Sparkles,
    placeholder: "What feature or capability would help your workflow? Describe your use case...",
    titlePlaceholder: "Feature idea (e.g., Export chat to Notion)",
  },
};

export function FeedbackModal({
  isOpen,
  initialType = "feedback",
  chatId,
  userEmail,
  accessToken,
  onClose,
}: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>(initialType);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(userEmail ?? "");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setRating(0);
      setHoverRating(0);
      setTitle("");
      setMessage("");
      setContactEmail(userEmail ?? "");
      setError(null);
    }
  }, [isOpen, initialType, userEmail]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentConfig = TYPE_CONFIG[type];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 3) {
      setError("Please provide at least a few words of feedback.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const metadata = includeMetadata
        ? {
            url: typeof window !== "undefined" ? window.location.href : undefined,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            chatId: chatId || undefined,
            screenSize:
              typeof window !== "undefined"
                ? `${window.innerWidth}x${window.innerHeight}`
                : undefined,
          }
        : undefined;

      await apiClient.submitFeedback(
        {
          type,
          title: title.trim() || undefined,
          message: message.trim(),
          rating: rating > 0 ? rating : undefined,
          contactEmail: contactEmail.trim() || undefined,
          metadata,
        },
        accessToken
      );

      toast.success(
        type === "bug_report"
          ? "Bug report received! We'll look into it."
          : "Thank you for your feedback!",
        { id: "feedback-success" }
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-6 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-(--chat-dropdown-border)">
          <div className="flex items-center gap-2">
            <h3 id="feedback-modal-title" className="text-lg font-semibold text-(--chat-text)">
              Share your feedback
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) hover:cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500 border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category Tabs */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-(--chat-text-secondary)">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["feedback", "bug_report", "feature_request"] as const).map((cat) => {
                const conf = TYPE_CONFIG[cat];
                const Icon = conf.icon;
                const isSelected = type === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setType(cat)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                        : "border-(--chat-dropdown-border) bg-(--chat-bg) text-(--chat-text-secondary) hover:border-(--chat-dropdown-border)/80 hover:text-(--chat-text)"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Star Rating (primarily for feedback / experience) */}
          {type === "feedback" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-(--chat-text-secondary)">
                How has your experience been?
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-(--chat-text-secondary) transition hover:scale-110 cursor-pointer"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "h-5 w-5 transition-colors",
                        (hoverRating || rating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-(--chat-dropdown-border)"
                      )}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-xs text-(--chat-text-secondary)">
                    {rating === 5
                      ? "Outstanding!"
                      : rating === 4
                      ? "Good"
                      : rating === 3
                      ? "Average"
                      : "Needs improvement"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Title (Optional) */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-(--chat-text-secondary)">
              {type === "bug_report" ? "Bug Summary" : "Title (Optional)"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={currentConfig.titlePlaceholder}
              maxLength={200}
              className="w-full rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint) focus:ring-1 focus:ring-(--chat-focus-ring)"
            />
          </div>

          {/* Detailed Message */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-(--chat-text-secondary)">
              <span>Details <span className="text-red-500">*</span></span>
              <span className="font-normal lowercase text-(--chat-text-faint)">
                {message.length}/3000
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={currentConfig.placeholder}
              rows={4}
              maxLength={3000}
              required
              className="w-full resize-y rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2.5 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint) focus:ring-1 focus:ring-(--chat-focus-ring)"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-(--chat-text-secondary)">
              Your Email (Optional, for follow up)
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2 text-sm text-(--chat-text) outline-none placeholder:text-(--chat-text-faint) focus:ring-1 focus:ring-(--chat-focus-ring)"
            />
          </div>

          {/* Diagnostic metadata checkbox */}
          <label className="flex items-center gap-2 text-xs text-(--chat-text-secondary) cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="rounded border-(--chat-dropdown-border) text-primary focus:ring-primary h-3.5 w-3.5"
            />
            <span>Include browser info and current page URL to help diagnose</span>
          </label>

          {/* Action buttons */}
          <div className="mt-5 flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-sidebar-hover) disabled:opacity-50 cursor-pointer"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || message.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
