import { Message } from '@/types';
import { MessageItem } from './message-item';

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
}

export function MessageList({ messages, streamingContent, isStreaming }: MessageListProps) {
  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
          streamingContent={streamingContent}
        />
      ))}
    </div>
  );
}
