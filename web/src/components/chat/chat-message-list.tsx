
"use client";

import {
  AtSign,
  Copy,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  RefreshCw,
  Paperclip,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { FaBrain } from "react-icons/fa";
import { useEffect, useRef, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { ChatMessage, ModelInfo } from "@/lib/types";
import { formatSourceHost, formatTime } from "@/lib/chat-utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  chatError: string | null;
  availableModels: ModelInfo[];
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  isLoadingMessages,
  chatError,
  availableModels,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
      {chatError ? (
        <div className="mb-4 rounded-lg border border-(--chat-error-border) bg-(--chat-error-bg) px-3 py-2 text-sm text-(--chat-error-text)">
          {chatError}
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

            return (
              <div
                key={message._id ?? `${message.role}-${index}`}
                className={cn("flex", isUser ? "justify-end" : "justify-start")}
              >
                {isUser ? (
                  /* ── User bubble: dark-blue pill, right-aligned ── */
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl bg-(--chat-user-bubble) px-5 py-2.5 text-[15px] leading-6 text-(--chat-user-bubble-text) whitespace-pre-wrap wrap-break-word">
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {message.attachments.map((att: any, i: number) => (
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
                  </div>
                ) : (
                  /* ── AI response: no bubble, full-width text ── */
                  <div className="w-full max-w-none">
                    {displayContent ? (
                      <div className="prose dark:prose-invert max-w-none text-[15px] leading-8 text-(--chat-ai-text)">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(
                                className || ""
                              );
                              const inline =
                                !match && !String(children).includes("\n");
                              return !inline && match ? (
                                <CodeBlock
                                  language={match[1]}
                                  value={String(children).replace(
                                    /\n$/,
                                    ""
                                  )}
                                  {...props}
                                />
                              ) : (
                                <code
                                  className={cn(
                                    "bg-neutral-200 dark:bg-neutral-800 rounded px-1 py-0.5 text-sm",
                                    className
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {displayContent}
                        </ReactMarkdown>
                      </div>
                    ) : null}

                    {message.sources && message.sources.length > 0 ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {message.sources.map((source, sourceIndex) => {
                          const href = source.url ?? source.link;
                          return (
                            <a
                              key={`${source.title}-${sourceIndex}`}
                              href={href || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-(--chat-dropdown-border) bg-(--chat-source-card) p-3 text-xs transition hover:bg-(--chat-source-card-hover)"
                            >
                              <p className="font-medium text-(--chat-source-title)">
                                {source.title || "Source"}
                              </p>
                              {source.snippet ? (
                                <p className="mt-1 line-clamp-3 text-(--chat-source-snippet)">
                                  {source.snippet}
                                </p>
                              ) : null}
                              {href ? (
                                <p className="mt-2 inline-flex items-center gap-1 text-(--chat-source-link)">
                                  <AtSign className="h-3 w-3" />
                                  {formatSourceHost(href)}
                                </p>
                              ) : null}
                            </a>
                          );
                        })}
                      </div>
                    ) : null}

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

                    {message.isStreaming ? (
                      <div className="mt-3 inline-flex items-center gap-2 text-xs text-(--chat-loading)">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        thinking...
                      </div>
                    ) : null}

                    {/* Action bar */}
                    {!message.isStreaming && displayContent ? (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-(--chat-action-icon) bg-(--chat-dropdown-hover) px-2 py-1 rounded-md">
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
                        {[
                          { icon: Copy, label: "Copy" },
                          { icon: ThumbsUp, label: "Like" },
                          { icon: ThumbsDown, label: "Dislike" },
                          // { icon: Share, label: "Share" },
                          // { icon: RefreshCw, label: "Regenerate" },
                          // { icon: MoreHorizontal, label: "More" },
                        ].map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--chat-action-icon) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)"
                            aria-label={action.label}
                            onClick={() => {
                              if (action.label === "Copy" && displayContent) {
                                void navigator.clipboard.writeText(
                                  displayContent
                                );
                              }
                            }}
                          >
                            <action.icon className="h-4 w-4" />
                          </button>
                        ))}
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
