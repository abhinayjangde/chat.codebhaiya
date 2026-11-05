"use client";

import {
  Check,
  Copy,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Paperclip,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { FaBrain } from "react-icons/fa";
import {
  Children,
  isValidElement,
  memo,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import toast from "react-hot-toast";
import NextImage from "next/image";
import { CodeBlock } from "@/components/ui/code-block";
import { CitationMarker } from "@/components/chat/citation-popover";
import { ChatLoadingIndicator } from "@/components/chat/chat-loading-indicator";
import { cn } from "@/lib/utils";
import { ChatMessage, MessageSource, ModelInfo } from "@/lib/types";
import { formatTime } from "@/lib/chat-utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  chatError: string | null;
  availableModels: ModelInfo[];
  streamSteps?: { id: "thinking" | "webSearch" | "analyzing"; label: string; status: "pending" | "active" | "complete" }[] | null;
  onEditMessage: (message: ChatMessage) => void;
  onRegenerateMessage: (message: ChatMessage, userMessage: ChatMessage) => void;
  onRetry?: () => void;
  onOpenResume?: () => void;
  targetMessageId?: string | null;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  isLoadingMessages,
  chatError,
  availableModels,
  onEditMessage,
  onRegenerateMessage,
  onRetry,
  onOpenResume,
  targetMessageId,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, "like" | "dislike">>({});

  useEffect(() => {
    if (targetMessageId) {
      const element = document.getElementById(`message-${targetMessageId}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, targetMessageId]);

  // Strip user prompt from AI response if echoed
  const getDisplayContent = (message: ChatMessage, index: number) => {
    let displayContent = message.content;
    if (message.role === "assistant" && index > 0) {
      const prevMsg = messages[index - 1];
      if (
        prevMsg?.role === "user" &&
        prevMsg.content &&
        displayContent.startsWith(prevMsg.content)
      ) {
        displayContent = displayContent
          .slice(prevMsg.content.length)
          .trimStart();
      }
    }
    return displayContent;
  };

  const handleCopy = (text: string, id: string) => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    void navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    toast.success("Copied to clipboard", { id: "chat-copy-toast", duration: 1800 });
    setTimeout(() => {
      setCopiedMessageId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  const handleFeedback = (id: string, type: "like" | "dislike") => {
    setFeedbackMap((prev) => {
      const current = prev[id];
      if (current === type) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (type === "like") {
        toast.success("Thanks for your feedback!", { id: "chat-feedback-toast", duration: 1800 });
      } else {
        toast("Feedback recorded", { icon: "📝", id: "chat-feedback-toast", duration: 1800 });
      }
      return { ...prev, [id]: type };
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
      {chatError ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-(--chat-error-border) bg-(--chat-error-bg) px-3 py-2 text-sm text-(--chat-error-text)" role="alert">
          <span>{chatError}</span>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition hover:bg-(--chat-error-text)/10">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {isLoadingMessages ? (
        <div className="flex items-center gap-2 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-3 py-2 text-sm text-(--chat-loading)">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading messages...
        </div>
      ) : (
        <div className="space-y-6">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const displayContent = getDisplayContent(message, index);
            const messageId = message._id ?? `msg-${index}`;
            const isTarget = Boolean(targetMessageId && (message._id === targetMessageId || messageId === targetMessageId));

            return (
              <div
                key={messageId}
                id={`message-${messageId}`}
                className={cn(
                  "flex transition-all duration-700 rounded-2xl",
                  isTarget && "ring-2 ring-amber-500/80 bg-amber-500/10 dark:bg-amber-400/15 dark:ring-amber-400 p-2.5",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {isUser ? (
                  /* ── User bubble: dark-blue pill, right-aligned ── */
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl bg-(--chat-user-bubble) px-5 py-2.5 text-[15px] leading-6 text-(--chat-user-bubble-text) whitespace-pre-wrap wrap-break-word">
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {message.attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-md bg-white/10 py-1 px-2 border border-white/20 text-sm shadow-sm">
                              {att.type === "image" ? (
                                <img src={att.content} alt={att.name} className="h-8 w-8 object-cover rounded-sm" />
                              ) : (
                                <Paperclip className="h-4 w-4" />
                              )}
                              <span className="max-w-[150px] truncate text-xs">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {message.content}
                    </div>
                    <p className="mt-1 text-right text-[11px] text-(--chat-timestamp)">
                      {formatTime(message.createdAt)}
                    </p>
                    <div className="mt-1 flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-[11px] text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
                        onClick={() => onEditMessage(message)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── AI response: formatted text with rich typography ── */
                  <div className="w-full max-w-none">
                    {message.isStreaming && !displayContent.trim() ? (
                      <ChatLoadingIndicator
                        hasWebSearch={
                          message.activeTool === "web_search" ||
                          message.usedTools?.some((t) => t.name === "web_search") ||
                          Boolean(message.sources && message.sources.length > 0)
                        }
                        activeTool={message.activeTool}
                      />
                    ) : null}
                    {displayContent ? (
                      <div className="chat-markdown max-w-none text-[15px] leading-relaxed text-(--chat-ai-text)">
                        <CitationAwareContent
                          content={displayContent}
                          sources={message.sources ?? []}
                        />
                      </div>
                    ) : null}

                    {message.errorMessage ? (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-(--chat-error-border) bg-(--chat-error-bg) px-3 py-2 text-sm text-(--chat-error-text)" role="alert">
                        <span className="min-w-0 flex-1">{message.errorMessage}</span>
                        {onRetry ? (
                          <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition hover:bg-(--chat-error-text)/10">
                            <RefreshCw className="h-3.5 w-3.5" /> Retry
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {message.attachments?.some((attachment) => attachment.type === "image") && (
                      <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-1">
                        {message.attachments.filter((attachment) => attachment.type === "image").map((attachment, imageIndex) => (
                          attachment.content ? (
                            <a
                              key={attachment.documentId ?? `${messageId}-image-${imageIndex}`}
                              href={attachment.content}
                              download={attachment.name || "generated-image.png"}
                              className="group block overflow-hidden rounded-2xl border border-(--chat-dropdown-border) bg-(--chat-surface)"
                              aria-label={`Download ${attachment.name || "generated image"}`}
                            >
                              <NextImage src={attachment.content} alt={attachment.name || "Generated image"} width={1024} height={1024} unoptimized sizes="(max-width: 768px) 100vw, 640px" className="h-auto max-h-[640px] w-full object-contain" />
                              <span className="block border-t border-(--chat-dropdown-border) px-3 py-2 text-xs text-(--chat-text-muted) group-hover:text-(--chat-text)">Click to download · {attachment.name}</span>
                            </a>
                          ) : null
                        ))}
                      </div>
                    )}

                    {/* Document sources accordion (web search sources are attached directly on citation line as small icons) */}
                    {(() => {
                      const documentSources =
                        message.sources?.filter((s) => s.type === "document") ?? [];
                      if (documentSources.length === 0) return null;

                      return (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {documentSources.map((source, sourceIndex) => {
                            const sourceCard = (
                              <>
                                <p className="font-medium text-(--chat-source-title)">
                                  {source.title || "Document source"}
                                </p>
                                {source.pageNumber ? (
                                  <p className="mt-1 text-[11px] uppercase tracking-wider text-(--chat-source-link)">
                                    Page {source.pageNumber} · chunk {(source.chunkIndex ?? 0) + 1}
                                  </p>
                                ) : null}
                                {source.snippet ? (
                                  <p className="mt-1 line-clamp-3 text-(--chat-source-snippet)">
                                    {source.snippet}
                                  </p>
                                ) : null}
                              </>
                            );
                            return (
                              <details
                                key={`${source.title}-${sourceIndex}`}
                                className="group rounded-xl border border-(--chat-dropdown-border) bg-(--chat-source-card) p-3 text-xs transition hover:bg-(--chat-source-card-hover)"
                              >
                                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-(--chat-source-title)">
                                  <span className="truncate">{source.title || "Document source"}</span>
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 transition group-open:rotate-180" />
                                </summary>
                                <div className="mt-2 border-t border-(--chat-dropdown-border) pt-2">
                                  {sourceCard}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {message.usedTools && message.usedTools.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.usedTools.map((tool, toolIndex) => (
                          <span
                            key={`${tool.name}-${toolIndex}`}
                            className="inline-flex items-center gap-1 rounded-full border border-(--chat-dropdown-border) bg-(--chat-tool-badge) px-2.5 py-1 text-xs text-(--chat-tool-badge-text)"
                          >
                            <MessageSquareText className="h-3 w-3" />
                            {tool.name}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Resume Created / Updated Callout Card */}
                    {message.usedTools?.some((t) => t.name === "save_or_update_resume") && onOpenResume ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-blue-500/30 bg-black/10 p-3 text-xs text-blue-700 dark:text-blue-300">
                        <div className="flex items-center gap-2">
                          
                          <span>
                            <strong>Resume Created & Tailored:</strong> Live preview is ready.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={onOpenResume}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition cursor-pointer shrink-0"
                        >
                          Open in Side View
                        </button>
                      </div>
                    ) : null}

                    {/* Action bar */}
                    {!message.isStreaming && displayContent ? (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-(--chat-action-icon) bg-(--chat-dropdown-hover) px-2.5 py-1 rounded-md">
                          <FaBrain className="h-3 w-3" />
                          <span className="text-[11px] font-medium">
                            {message.modelName 
                                ? availableModels?.find(m => m.id === message.modelName)?.displayName || message.modelName
                                : "AI Assistant"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="mr-2 text-[11px] text-(--chat-timestamp)">
                            {formatTime(message.createdAt)}
                          </p>
                          
                          {/* Copy button */}
                          <button
                            type="button"
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
                              copiedMessageId === messageId && "text-emerald-500 bg-emerald-500/10"
                            )}
                            title={copiedMessageId === messageId ? "Copied!" : "Copy response"}
                            aria-label="Copy"
                            onClick={() => handleCopy(displayContent, messageId)}
                          >
                            {copiedMessageId === messageId ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          {/* Like button */}
                          <button
                            type="button"
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
                              feedbackMap[messageId] === "like" && "text-emerald-500 bg-emerald-500/10 hover:text-emerald-600"
                            )}
                            title="Good response"
                            aria-label="Like"
                            onClick={() => handleFeedback(messageId, "like")}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>

                          {/* Dislike button */}
                          <button
                            type="button"
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
                              feedbackMap[messageId] === "dislike" && "text-rose-500 bg-rose-500/10 hover:text-rose-600"
                            )}
                            title="Bad response"
                            aria-label="Dislike"
                            onClick={() => handleFeedback(messageId, "dislike")}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>

                          {/* Regenerate button */}
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
                            title="Regenerate response"
                            aria-label="Regenerate"
                            onClick={() => {
                              const previousUser = messages
                                .slice(0, index)
                                .reverse()
                                .find((entry) => entry.role === "user");
                              if (previousUser) {
                                onRegenerateMessage(message, previousUser);
                              }
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
});

function CitationAwareContent({
  content,
  sources,
}: {
  content: string;
  sources: MessageSource[];
}) {
  // Turn valid citations into markdown links [citation:1](citation:1),
  // handling formats like [1], [citation:1], citation:1, [1, 2], and citation links,
  // while preserving any content inside code blocks or inline code snippets.
  const processedContent = useMemo(() => {
    if (!content) return "";
    let text = content;

    // Clean redundant trailing "Sources:" / "Citations:" list if sources are present
    if (sources && sources.length > 0) {
      text = text.replace(
        /\n+(?:###?\s*)?(?:Sources|Citations|References):\s*(?:\n+[-*•]?\s*(?:\[?(?:citation:\s*)?\d+\]?|[0-9]+\.)[^\n]+)+$/i,
        ""
      );
    }

    if (!sources || sources.length === 0) return text;

    // Expand combined bracket citations e.g. [1, 2] -> [1] [2]
    text = text.replace(
      /\[(\d+(?:\s*,\s*\d+)+)\]/g,
      (_, nums) => nums.split(",").map((n: string) => `[${n.trim()}]`).join(" ")
    );

    return text.replace(
      /(```[\s\S]*?```|`[^`\n]+`)|(?:\[(?:citation:\s*)?(\d+)\]\((?:citation:\d+|https?:\/\/[^\s)]+)\))|(?:\[(?:citation:\s*)?(\d+)\])|(?:\(?citation:\s*(\d+)\)?)/gi,
      (match, codeSegment, linkIndex, bracketIndex, rawIndex) => {
        if (codeSegment) {
          return codeSegment;
        }

        const citationNum = linkIndex || bracketIndex || rawIndex;
        if (!citationNum) return match;

        const idx = parseInt(citationNum, 10);
        if (isNaN(idx)) return match;

        const hasSource = sources.some(
          (s) => s.position === idx || sources[idx - 1] !== undefined
        );

        if (hasSource) {
          return `[citation:${idx}](citation:${idx})`;
        }

        return match;
      }
    );
  }, [content, sources]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        p: ({ children }) => (
          <p className="mb-3.5 last:mb-0 leading-[1.7] text-(--chat-ai-text)">
            {children}
          </p>
        ),
        h1: ({ children }) => (
          <h1 className="mt-6 mb-3 text-2xl font-bold tracking-tight text-(--chat-text) first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-5 mb-2.5 text-xl font-semibold tracking-tight text-(--chat-text) first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 mb-2 text-lg font-semibold text-(--chat-text) first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-3 mb-1.5 text-base font-semibold text-(--chat-text) first:mt-0">
            {children}
          </h4>
        ),
        ul: ({ children }) => (
          <ul className="my-3 ml-1 list-disc space-y-1.5 pl-5 text-(--chat-ai-text) marker:text-(--chat-text-secondary)/80">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 ml-1 list-decimal space-y-1.5 pl-5 text-(--chat-ai-text) marker:font-semibold marker:text-(--chat-text-secondary)/80">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-1 leading-[1.65]">
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-(--chat-text)">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-3.5 border-l-2 border-primary/70 bg-(--chat-surface)/50 px-4 py-2.5 rounded-r-lg italic text-(--chat-text-secondary)">
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr className="my-5 border-0 h-px bg-(--chat-dropdown-border)" />
        ),
        a: ({ href, children }) => {
          if (href?.startsWith("citation:")) {
            const index = parseInt(href.slice("citation:".length), 10);
            const source =
              sources.find((s) => s.position === index) ?? sources[index - 1];
            if (source) {
              return <CitationMarker index={index} source={source} />;
            }
          }

          // Fallback if href directly points to a source URL or children is a citation format
          if (href) {
            const matchedSource = sources.find(
              (s) => (s.url && s.url === href) || (s.link && s.link === href)
            );
            if (matchedSource) {
              const index = matchedSource.position ?? (sources.indexOf(matchedSource) + 1);
              return <CitationMarker index={index} source={matchedSource} />;
            }
          }

          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors cursor-pointer"
            >
              {children}
            </a>
          );
        },
        code: ({ className, children, ...props }) => {
          const isInline = !className?.includes("language-");
          if (isInline) {
            return (
              <code
                className="rounded-md bg-(--chat-surface) px-1.5 py-0.5 font-mono text-[0.85em] font-medium text-emerald-600 dark:text-emerald-400 border border-(--chat-dropdown-border) shadow-2xs"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => {
          const codeElement = Children.toArray(children).find(isValidElement) as
            | ReactElement<{ className?: string; children?: ReactNode }>
            | undefined;
          const codeProps = codeElement?.props;
          const language =
            codeProps?.className?.match(/language-([\w+-]+)/)?.[1] ?? "text";
          const codeString = String(codeProps?.children ?? "").replace(/\n$/, "");

          return <CodeBlock language={language} value={codeString} />;
        },
        table: ({ children }) => (
          <div className="my-4 w-full overflow-x-auto rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface)/40 shadow-xs">
            <table className="w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-(--chat-dropdown-border) bg-(--chat-surface) text-xs font-semibold uppercase tracking-wider text-(--chat-text-secondary)">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2.5 font-semibold text-(--chat-text)">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-t border-(--chat-dropdown-border)/50 px-4 py-2 text-(--chat-ai-text)">
            {children}
          </td>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-(--chat-dropdown-hover)/50 transition-colors">
            {children}
          </tr>
        ),
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
