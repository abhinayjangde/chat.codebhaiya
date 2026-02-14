import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Bot, Copy, Check, ExternalLink } from 'lucide-react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function MessageItem({ message, isStreaming, streamingContent }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const displayContent = isStreaming && streamingContent ? streamingContent : message.content;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex gap-4 px-4 py-6 rounded-lg',
        isUser ? 'bg-background' : 'bg-muted/50'
      )}
    >
      {/* Avatar */}
      <Avatar className={cn('h-8 w-8 shrink-0', isUser ? 'bg-primary' : 'bg-green-600')}>
        <AvatarFallback className="text-primary-foreground">
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">
            {isUser ? 'You' : 'ChatBhaiya'}
          </span>
          {!isUser && message.content && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Message Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {isUser ? (
            <p className="whitespace-pre-wrap">{displayContent}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="whitespace-pre-wrap mb-4">{children}</p>,
                code: ({ children }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {children}
                  </pre>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          )}
        </div>

        {/* Sources (for assistant messages) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, i) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-background border rounded-full px-2.5 py-1 hover:bg-accent transition-colors"
                >
                  <span className="text-muted-foreground">[{source.position}]</span>
                  <span className="truncate max-w-[150px]">{source.title}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Streaming Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">Thinking</span>
            <span className="animate-pulse">...</span>
          </div>
        )}
      </div>
    </div>
  );
}
