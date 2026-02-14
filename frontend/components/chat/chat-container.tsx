'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { SourcesSidebar } from './sources-sidebar';
import { useChatStore } from '@/stores/chat-store';
import { chatApi } from '@/lib/chat-api';
import { toast } from 'sonner';

export function ChatContainer() {
  const params = useParams();
  const chatId = params?.chatId as string | undefined;
  const [showSources, setShowSources] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const messages = useChatStore((state) => state.messages);
  const streamingContent = useChatStore((state) => state.streamingContent);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const sources = useChatStore((state) => state.sources);
  const setCurrentChat = useChatStore((state) => state.setCurrentChat);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const setPagination = useChatStore((state) => state.setPagination);
  const appendStreamingContent = useChatStore((state) => state.appendStreamingContent);
  const setIsStreaming = useChatStore((state) => state.setIsStreaming);
  const setSources = useChatStore((state) => state.setSources);
  const clearStreaming = useChatStore((state) => state.clearStreaming);

  // Load chat messages when chatId changes
  useEffect(() => {
    if (chatId) {
      loadChat(chatId);
    } else {
      // New chat - clear messages
      setMessages([]);
      setCurrentChat(null);
    }
  }, [chatId]);

  const loadChat = async (id: string) => {
    try {
      const response = await chatApi.getMessages(id, { limit: 50 });
      if (response.success) {
        setMessages(response.data.messages);
        setPagination(response.data.pagination.hasMore, response.data.pagination.nextCursor);
        // Find current chat from store
        const chats = useChatStore.getState().chats;
        const chat = chats.find((c) => c._id === id);
        if (chat) {
          setCurrentChat(chat);
        }
      }
    } catch (error) {
      toast.error('Failed to load chat');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    addMessage({
      role: 'user',
      content: content.trim(),
    });

    // Clear any previous streaming state
    clearStreaming();
    setIsStreaming(true);

    try {
      let currentChatId = chatId;

      // If no chatId, create a new chat first
      if (!currentChatId) {
        const createResponse = await chatApi.createChat(content.trim());
        if (createResponse.success) {
          currentChatId = createResponse.data.chatId;
          // Refresh chat list
          const chatsResponse = await chatApi.getChats();
          if (chatsResponse.success) {
            useChatStore.getState().setChats(chatsResponse.data.chats);
          }
          // Navigate to new chat
          window.history.pushState({}, '', `/c/${currentChatId}`);
        } else {
          throw new Error('Failed to create chat');
        }
      }

      // Add placeholder for assistant message
      addMessage({
        role: 'assistant',
        content: '',
      });

      // Stream the response
      await chatApi.streamMessage(
        currentChatId,
        content.trim(),
        // onToken
        (token) => {
          appendStreamingContent(token);
        },
        // onToolStart
        (tool) => {
          console.log('Tool started:', tool);
        },
        // onSources
        (newSources) => {
          setSources(newSources);
          setShowSources(true);
        },
        // onDone
        (data) => {
          setIsStreaming(false);
          // Update the last message with final content
          const messages = useChatStore.getState().messages;
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = useChatStore.getState().streamingContent;
            lastMessage.sources = data.sources;
            lastMessage.usedTools = data.usedTools;
            useChatStore.getState().setMessages([...messages]);
          }
          clearStreaming();
        },
        // onError
        (error) => {
          setIsStreaming(false);
          toast.error(error);
          clearStreaming();
        }
      );
    } catch (error: any) {
      setIsStreaming(false);
      toast.error(error.message || 'Failed to send message');
      clearStreaming();
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [streamingContent, isStreaming]);

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ChatBhaiya
                </h1>
                <p className="text-muted-foreground max-w-md">
                  Your AI assistant with web search capabilities. Ask me anything!
                </p>
                <div className="mt-8 flex gap-2 flex-wrap justify-center">
                  {['What is the weather today?', 'Latest AI news', 'Explain quantum computing'].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <MessageList
                messages={messages}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
              />
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              disabled={isStreaming}
              placeholder="Message ChatBhaiya..."
            />
            <p className="text-xs text-center text-muted-foreground mt-2">
              ChatBhaiya can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>

      {/* Sources Sidebar */}
      <SourcesSidebar
        sources={sources}
        isOpen={showSources}
        onClose={() => setShowSources(false)}
      />
    </div>
  );
}
