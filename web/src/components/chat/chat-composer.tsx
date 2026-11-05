
"use client";

import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Gavel,
  FileText,
  Image,
  MoreHorizontal,
  Paperclip,
  Plus,
  Sparkles,
  Square,
  Telescope,
  Loader2,
} from "lucide-react";
import { FaBrain } from "react-icons/fa";
import {
  type DragEvent,
  type KeyboardEvent,
  type FormEvent,
  useState,
  useRef,
  memo,
} from "react";
import { cn } from "@/lib/utils";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { McpServer, ModelInfo } from "@/lib/types";
import { Bot } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiMeta, SiOpenai } from "react-icons/si";
import toast from "react-hot-toast";
import type { Attachment } from "@/lib/types";
import { PromptToolsMenu } from "@/components/chat/prompt-tools-menu";

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
    case "auto":
      return <FaBrain className={className} />;
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

export type { Attachment };

interface ChatComposerProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  onGenerateImage?: (prompt: string) => void;
  onStop?: () => void;
  isSending: boolean;
  isBootstrapping: boolean;
  availableModels: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onUploadFile?: (file: File) => Promise<Attachment>;
  onDocumentStatus?: (documentId: string) => Promise<Pick<Attachment, "status" | "errorMessage">>;
  variant: "center" | "footer";
  inputValue?: string;           // Optional controlled input
  onInputChange?: (val: string) => void; // Optional control handler
  mcpServers?: McpServer[];
  selectedMcpServerIds?: string[];
  onMcpServerIdsChange?: (ids: string[]) => void;
  onOpenResumeWizard?: () => void;
}

export const ChatComposer = memo(function ChatComposer({
  onSend,
  onGenerateImage,
  onStop,
  isSending,
  isBootstrapping,
  availableModels,
  selectedModel,
  onModelChange,
  onUploadFile,
  onDocumentStatus,
  variant,
  inputValue,
  onInputChange,
  mcpServers = [],
  selectedMcpServerIds = [],
  onMcpServerIdsChange,
  onOpenResumeWizard,
}: ChatComposerProps) {
  // If controlled props are provided, use them; otherwise use local state
  const [internalComposer, setInternalComposer] = useState("");
  const composer = inputValue !== undefined ? inputValue : internalComposer;
  const setComposer = onInputChange || setInternalComposer;

  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedUploads, setFailedUploads] = useState<Array<{ file: File; message: string }>>([]);
  const [imageGenerationMode, setImageGenerationMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const pollDocumentStatus = async (documentId: string) => {
    if (!onDocumentStatus) {
      return;
    }

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1_000));
      const status = await onDocumentStatus(documentId);

      setAttachments((current) =>
        current.map((attachment) =>
          attachment.documentId === documentId
            ? { ...attachment, ...status }
            : attachment
        )
      );

      if (status.status === "ready" || status.status === "failed") {
        return;
      }
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || !onUploadFile) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setPlusMenuOpen(false);

    const failed: Array<{ file: File; message: string }> = [];
    for (const file of files) {
      try {
        const result = await onUploadFile(file);
        setAttachments((previous) => [...previous, result]);

        if (result.documentId && result.type === "document" && result.status !== "ready") {
          void pollDocumentStatus(result.documentId).catch((error) => {
            setUploadError(error instanceof Error ? error.message : "Unable to check document status");
          });
        }
      } catch (error) {
        failed.push({
          file,
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }
    if (failed.length > 0) {
      setFailedUploads((previous) => [...previous, ...failed]);
      setUploadError(`${failed.length} file${failed.length === 1 ? "" : "s"} could not be uploaded. Retry below.`);
    }
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const retryUpload = async (index: number) => {
    const failed = failedUploads[index];
    if (!failed || !onUploadFile || isUploading) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await onUploadFile(failed.file);
      setAttachments((previous) => [...previous, result]);
      setFailedUploads((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
      if (result.documentId && result.type === "document" && result.status !== "ready") {
        void pollDocumentStatus(result.documentId).catch((error) => {
          setUploadError(error instanceof Error ? error.message : "Unable to check document status");
        });
      }
      if (failedUploads.length === 1) setUploadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setFailedUploads((previous) => previous.map((item, itemIndex) =>
        itemIndex === index ? { ...item, message } : item
      ));
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      await uploadFiles(Array.from(files));
    }
  };

  const handleDragOver = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isSending && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (isSending || isUploading) {
      return;
    }

    await uploadFiles(Array.from(event.dataTransfer.files));
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const submitPrompt = () => {
    if (failedUploads.length > 0) {
      setUploadError("Retry or remove failed uploads before sending.");
      return;
    }
    if (imageGenerationMode && onGenerateImage) {
      onGenerateImage(composer);
    } else {
      onSend(composer, attachments.length > 0 ? attachments : undefined);
    }
    setAttachments([]);
    setImageGenerationMode(false);
    if (inputValue === undefined) setInternalComposer("");
  };

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composer.trim() && attachments.length === 0) return;
    if (isSending || isUploading) return;
    if (attachments.some((attachment) => attachment.type === "document" && attachment.status !== "ready")) {
      setUploadError("Wait for document processing to finish before sending.");
      return;
    }
    if (attachments.some((attachment) => attachment.status === "failed")) {
      setUploadError("Remove the failed document and upload it again.");
      return;
    }
    submitPrompt();
  };

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!composer.trim() && attachments.length === 0) return;
      if (isSending || isUploading) return;
      if (attachments.some((attachment) => attachment.type === "document" && attachment.status !== "ready")) {
        setUploadError("Wait for document processing to finish before sending.");
        return;
      }
      if (attachments.some((attachment) => attachment.status === "failed")) {
        setUploadError("Remove the failed document and upload it again.");
        return;
      }
      submitPrompt();
    }
  };

  return (
    <form
      className={cn(
        "relative mx-auto w-full",
        variant === "center" ? "max-w-2xl" : "max-w-3xl"
      )}
      onSubmit={handleComposerSubmit}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-(--chat-brand) bg-(--chat-brand)/10 text-sm font-medium text-(--chat-brand)">
          <span className="rounded-full bg-(--chat-surface) px-4 py-2 shadow-lg">
            Drop files to attach
          </span>
        </div>
      )}
      <div className="rounded-2xl mx-1 md:mx-0 border border-(--chat-composer-border) bg-(--chat-composer) px-4 pb-2.5 pt-3">
        {uploadError && (
          <p className="mb-2 text-xs text-red-500" role="alert">{uploadError}</p>
        )}
        {failedUploads.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {failedUploads.map(({ file, message }, index) => (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-(--chat-error-border) bg-(--chat-error-bg) px-2.5 py-1.5 text-xs text-(--chat-error-text)">
                <span className="min-w-0 flex-1 truncate" title={message}>{file.name} · {message}</span>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => void retryUpload(index)} disabled={isUploading} className="font-medium underline underline-offset-2 disabled:opacity-50">Retry upload</button>
                  <button type="button" onClick={() => setFailedUploads((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} className="underline underline-offset-2">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {imageGenerationMode && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-(--chat-brand)/30 bg-(--chat-brand)/10 px-3 py-2 text-xs text-(--chat-brand)">
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Image generation · Gemini</span>
            <button type="button" onClick={() => setImageGenerationMode(false)} className="text-(--chat-text-muted) hover:text-(--chat-text)">Cancel</button>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att, i) => (
              <div key={i} className="relative flex items-center gap-2 rounded-md bg-(--chat-dropdown-hover) py-1 px-2 pr-6 border border-(--chat-dropdown-border) text-sm shadow-sm group">
                {att.type === "image" ? (
                  att.content ? <img src={att.content} alt={att.name} className="h-6 w-6 object-cover rounded-sm" /> : <Paperclip className="h-4 w-4 text-blue-500" />
                ) : att.type === "audio" ? (
                  <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                ) : (
                  <Paperclip className="h-4 w-4 text-blue-500" />
                )}
                <span className="max-w-[120px] truncate text-xs text-(--chat-text)">{att.name}</span>
                {att.type === "document" && att.status !== "ready" && (
                  <span className={cn("text-[10px]", att.status === "failed" ? "text-red-500" : "text-(--chat-text-muted)")}>
                    {att.status === "failed" ? "failed" : att.status === "processing" ? "processing" : "queued"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute right-1 top-1 bottom-1 flex items-center justify-center w-4 text-(--chat-text-muted) hover:text-(--chat-text) opacity-0 group-hover:opacity-100 transition-opacity bg-(--chat-dropdown-hover)"
                >
                  <Plus className="h-3 w-3 rotate-45" />
                </button>
              </div>
            ))}
          </div>
        )}
        <AutoResizeTextarea
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={imageGenerationMode ? "Describe the image you want..." : variant === "center" ? "Ask anything..." : "Ask a follow-up"}
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
                "inline-flex hover:cursor-pointer h-8 w-8 items-center justify-center rounded-full border border-(--chat-composer-border) text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
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
                <div className="absolute bottom-full -left-4 mb-2 w-55 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl z-50">
                  {/* Upload images */}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={imageInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                    onClick={() => {
                      imageInputRef.current?.click();
                      setPlusMenuOpen(false);
                    }}
                  >
                    <Image className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                    Add images
                  </button>

                  {/* Upload files */}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*,application/pdf,text/*,.c,.cpp,.js,.ts,.py,.java,.md,.csv,.log"
                  />
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setPlusMenuOpen(false);
                    }}
                  >
                    <Paperclip className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                    Add files
                  </button>

                  <div className="my-1 border-t border-(--chat-dropdown-border)" />

                  {/* Build Resume */}
                  {onOpenResumeWizard && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                      onClick={() => {
                        setPlusMenuOpen(false);
                        onOpenResumeWizard();
                      }}
                    >
                      <FileText className="h-[18px] w-[18px] text-(--chat-brand)" />
                      <span>Resume builder</span>
                    </button>
                  )}

                  {onGenerateImage && <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) opacity-60 transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      toast("This feature is coming soon", { icon: "🚧" });
                    }}
                  >
                    <Sparkles className="h-[18px] w-[18px] text-(--chat-brand)" />
                    Create image
                  </button>}

                  {onMcpServerIdsChange && (
                    <>
                      <div className="my-1 border-t border-(--chat-dropdown-border)" />
                      <PromptToolsMenu
                        embedded
                        servers={mcpServers}
                        selectedServerIds={selectedMcpServerIds}
                        onServerIdsChange={onMcpServerIdsChange}
                      />
                    </>
                  )}

                  {/* Cloud */}
                  {/* <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setPlusMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <Cloud className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                      Add files from cloud
                    </span>
                    <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                  </button> */}

                  {/* <div className="my-1 border-t border-(--chat-dropdown-border)" /> */}

                  {/* Deep research */}
                  {/* <button
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
                  </button> */}

                  {/* Model council */}
                  {/* <button
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

                  <div className="my-1 border-t border-(--chat-dropdown-border)" /> */}

                  {/* More */}
                  {/* <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-(--chat-text) transition hover:bg-(--chat-dropdown-hover)"
                    onClick={() => setPlusMenuOpen(false)}
                  >
                    <span className="flex items-center gap-3">
                      <MoreHorizontal className="h-[18px] w-[18px] text-(--chat-text-secondary)" />
                      More
                    </span>
                    <ChevronRight className="h-4 w-4 text-(--chat-text-muted)" />
                  </button> */}
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
                disabled={imageGenerationMode}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover) disabled:cursor-default"
              >
                <ModelLogo
                  provider={imageGenerationMode ? "google" :
                    availableModels.find((m) => m.id === selectedModel)
                      ?.provider || ""
                  }
                  className="h-3.5 w-3.5"
                />
                {imageGenerationMode ? "Gemini Image" : availableModels.find((m) => m.id === selectedModel)?.displayName || "Model"}
                {!imageGenerationMode && <ChevronDown className="h-3 w-3" />}
              </button>

              {!imageGenerationMode && modelDropdownOpen && (
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
                disabled={isBootstrapping || (!composer.trim() && attachments.length === 0) || isUploading}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40",
                  (composer.trim() || attachments.length > 0) && !isUploading
                    ? "bg-(--chat-send-bg) text-white hover:bg-(--chat-send-bg-hover)"
                    : "bg-(--chat-dropdown-hover) text-(--chat-action-icon)"
                )}
                aria-label={imageGenerationMode ? "Generate image" : "Send"}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-(--chat-action-icon)" /> : imageGenerationMode ? <Sparkles className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
});
