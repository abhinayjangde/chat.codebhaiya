"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useChatStore = void 0;
const zustand_1 = require("zustand");
const types_1 = require("@/types");
exports.useChatStore = (0, zustand_1.create)((set, get) => ({
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
//# sourceMappingURL=chat-store.js.map