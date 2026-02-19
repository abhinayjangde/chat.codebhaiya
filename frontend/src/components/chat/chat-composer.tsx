
"use client";

import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Gavel,
  MoreHorizontal,
  Paperclip,
  Plus,
  Square,
  Telescope,
} from "lucide-react";
import { type KeyboardEvent, type FormEvent, useState } from "react";
import { cn } from "@/lib/utils";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { ModelInfo } from "@/lib/types";
import { Bot } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiMeta, SiOpenai } from "react-icons/si";

function ModelLogo({
  provider,
  className = "h-4 w-4",
}: {
  provider: string;
  className?: string;
}) {
  switch (provider) {
    case "groq":
      return <SiMeta className={className} />;
    case "google":
      return <FcGoogle className={className} />;
    case "openai":
      return <SiOpenai className={className} />;
    case "ollama":
      return (
        <span
          className={className}
          style={{ fontSize: "inherit", lineHeight: 1 }}
        >
          🦙
        </span>
      );
    default:
      return <Bot className={className} />;
  }
}

interface ChatComposerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isSending: boolean;
  isBootstrapping: boolean;
  availableModels: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  variant: "center" | "footer";
  inputValue?: string;           // Optional controlled input
  onInputChange?: (val: string) => void; // Optional control handler
}

export function ChatComposer({
  onSend,
  onStop,
  isSending,
  isBootstrapping,
  availableModels,
  selectedModel,
  onModelChange,
  variant,
  inputValue,
  onInputChange
}: ChatComposerProps) {
  // If controlled props are provided, use them; otherwise use local state
  const [internalComposer, setInternalComposer] = useState("");
  const composer = inputValue !== undefined ? inputValue : internalComposer;
  const setComposer = onInputChange || setInternalComposer;

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer.trim() || isSending) return;
    onSend(composer);
    if (inputValue === undefined) {
      setInternalComposer("");
    }
  };

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!composer.trim() || isSending) return;
      onSend(composer);
      if (inputValue === undefined) {
        setInternalComposer("");
      }
    }
  };

  return (
    <form
      className={cn(
        "mx-auto w-full",
        variant === "center" ? "max-w-2xl" : "max-w-3xl"
      )}
      onSubmit={handleComposerSubmit}
    >
      <div className="rounded-2xl border border-(--chat-composer-border) bg-(--chat-composer) px-4 pb-2.5 pt-3">
        <AutoResizeTextarea
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={variant === "center" ? "Ask anything..." : "Ask a follow-up"}
          maxHeight={140}
          disabled={isSending && !onStop || isBootstrapping}
          className="w-full resize-none border-0 bg-transparent text-[15px] leading-6 text-(--chat-input-text) outline-none placeholder:text-(--chat-input-placeholder) focus-visible:ring-0 min-h-[44px] py-[10px]"
        />

        <div className="mt-2 flex items-center justify-between">
          {/* Left — attach */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPlusMenuOpen(!plusMenuOpen)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full border border-(--chat-composer-border) text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
                plusMenuOpen && "bg-(--chat-dropdown-hover) text-(--chat-action-icon-hover)"
              )}
              aria-label="Attach"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Plus Menu Popup */}
            {plusMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPlusMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl z-50">
                  {/* Upload files */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setPlusMenuOpen(false)}
                  >
                    <Paperclip className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                    Upload files or images
                  </button>

                  {/* Cloud */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setPlusMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <Cloud className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                      Add files from cloud
                    </span>
                    <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                  </button>

                  <div className="my-1 border-t border-(--chat-dropdown-border)" />

                  {/* Deep research */}
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setPlusMenuOpen(false)}
                  >
                    <Telescope className="mt-0.5 h-[18px] w-[18px] text-(--chat-text-secondary)" />
                    <div>
                      <div className="text-sm font-medium text-(--chat-text)">
                        Deep research
                      </div>
                      <div className="text-xs text-(--chat-text-muted)">
                        In-depth reports and analysis
                      </div>
                    </div>
                  </button>

                  {/* Model council */}
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setPlusMenuOpen(false)}
                  >
                    <Gavel className="mt-0.5 h-[18px] w-[18px] text-(--chat-text-secondary)" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-(--chat-text)">
                          Model council
                        </span>
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                          Max
                        </span>
                      </div>
                      <div className="text-xs text-(--chat-text-muted)">
                        Multiple AI models at once
                      </div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-(--chat-dropdown-border)" />

                  {/* More */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setPlusMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <MoreHorizontal className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                      More
                    </span>
                    <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right — model, mic, send/stop */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
              >
                <ModelLogo
                  provider={
                    availableModels.find((m) => m.id === selectedModel)
                      ?.provider || ""
                  }
                  className="h-3.5 w-3.5"
                />
                {availableModels.find((m) => m.id === selectedModel)
                  ?.displayName || "Model"}
                <ChevronDown className="h-3 w-3" />
              </button>

              {modelDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setModelDropdownOpen(false)}
                  />
                  <div
                    className={cn(
                      "absolute bottom-full mb-2 z-20 w-56 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) p-1.5 shadow-2xl",
                      variant === "center" ? "left-0" : "right-0" // Align right for footer composer to prevent overflow potentially
                    )}
                  >
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onModelChange(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-(--chat-dropdown-hover) cursor-pointer",
                          selectedModel === model.id
                            ? "text-(--chat-text) bg-(--chat-dropdown-hover)"
                            : "text-(--chat-text-muted)"
                        )}
                      >
                        <ModelLogo
                          provider={model.provider}
                          className="h-4 w-4 shrink-0"
                        />
                        <span className="flex-1">{model.displayName}</span>
                        {selectedModel === model.id && (
                          <Check className="h-3.5 w-3.5 text-(--chat-action-icon)" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
              aria-label="Voice input"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
            {isSending ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--chat-stop-bg) text-(--chat-stop-text) transition hover:bg-(--chat-stop-bg-hover)"
                aria-label="Stop"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isBootstrapping || !composer.trim()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--chat-send-bg) text-white transition hover:bg-(--chat-send-bg-hover) disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
