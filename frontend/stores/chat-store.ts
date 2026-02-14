import { create } from 'zustand';
import { Chat, Message } from '@/types';

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  isStreaming: boolean;
  sources: any[];
  hasMore: boolean;
  nextCursor: string | null;
  setChats: (chats: Chat[]) => void;
  setCurrentChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setSources: (sources: any[]) => void;
  setPagination: (hasMore: boolean, nextCursor: string | null) => void;
  clearStreaming: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isLoading: false,
  streamingContent: '',
  isStreaming: false,
  sources: [],
  hasMore: false,
  nextCursor: null,
  
  setChats: (chats) => set({ chats }),
  
  setCurrentChat: (chat) => set({ currentChat: chat }),
  
  addChat: (chat) => set((state) => ({ 
    chats: [chat, ...state.chats],
    currentChat: chat 
  })),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = content;
    }
    return { messages };
  }),
  
  setStreamingContent: (content) => set({ streamingContent: content }),
  
  appendStreamingContent: (content) => set((state) => ({ 
    streamingContent: state.streamingContent + content 
  })),
  
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  
  setSources: (sources) => set({ sources }),
  
  setPagination: (hasMore, nextCursor) => set({ hasMore, nextCursor }),
  
  clearStreaming: () => set({ 
    streamingContent: '', 
    isStreaming: false, 
    sources: [] 
  }),
}));