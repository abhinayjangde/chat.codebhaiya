'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatContainer = ChatContainer;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const scroll_area_1 = require("@/components/ui/scroll-area");
const message_list_1 = require("./message-list");
const chat_input_1 = require("./chat-input");
const sources_sidebar_1 = require("./sources-sidebar");
const chat_store_1 = require("@/stores/chat-store");
const chat_api_1 = require("@/lib/chat-api");
const sonner_1 = require("sonner");
function ChatContainer() {
    const params = (0, navigation_1.useParams)();
    const chatId = params?.chatId;
    const [showSources, setShowSources] = (0, react_1.useState)(false);
    const scrollRef = (0, react_1.useRef)(null);
    const messages = (0, chat_store_1.useChatStore)((state) => state.messages);
    const streamingContent = (0, chat_store_1.useChatStore)((state) => state.streamingContent);
    const isStreaming = (0, chat_store_1.useChatStore)((state) => state.isStreaming);
    const sources = (0, chat_store_1.useChatStore)((state) => state.sources);
    const setCurrentChat = (0, chat_store_1.useChatStore)((state) => state.setCurrentChat);
    const setMessages = (0, chat_store_1.useChatStore)((state) => state.setMessages);
    const addMessage = (0, chat_store_1.useChatStore)((state) => state.addMessage);
    const setPagination = (0, chat_store_1.useChatStore)((state) => state.setPagination);
    const appendStreamingContent = (0, chat_store_1.useChatStore)((state) => state.appendStreamingContent);
    const setIsStreaming = (0, chat_store_1.useChatStore)((state) => state.setIsStreaming);
    const setSources = (0, chat_store_1.useChatStore)((state) => state.setSources);
    const clearStreaming = (0, chat_store_1.useChatStore)((state) => state.clearStreaming);
    // Load chat messages when chatId changes
    (0, react_1.useEffect)(() => {
        if (chatId) {
            loadChat(chatId);
        }
        else {
            // New chat - clear messages
            setMessages([]);
            setCurrentChat(null);
        }
    }, [chatId]);
    const loadChat = async (id) => {
        try {
            const response = await chat_api_1.chatApi.getMessages(id, { limit: 50 });
            if (response.success) {
                setMessages(response.data.messages);
                setPagination(response.data.pagination.hasMore, response.data.pagination.nextCursor);
                // Find current chat from store
                const chats = chat_store_1.useChatStore.getState().chats;
                const chat = chats.find((c) => c._id === id);
                if (chat) {
                    setCurrentChat(chat);
                }
            }
        }
        catch (error) {
            sonner_1.toast.error('Failed to load chat');
        }
    };
    const handleSendMessage = async (content) => {
        if (!content.trim())
            return;
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
                const createResponse = await chat_api_1.chatApi.createChat(content.trim());
                if (createResponse.success) {
                    currentChatId = createResponse.data.chatId;
                    // Refresh chat list
                    const chatsResponse = await chat_api_1.chatApi.getChats();
                    if (chatsResponse.success) {
                        chat_store_1.useChatStore.getState().setChats(chatsResponse.data.chats);
                    }
                    // Navigate to new chat
                    window.history.pushState({}, '', `/c/${currentChatId}`);
                }
                else {
                    throw new Error('Failed to create chat');
                }
            }
            // Add placeholder for assistant message
            addMessage({
                role: 'assistant',
                content: '',
            });
            // Stream the response
            await chat_api_1.chatApi.streamMessage(currentChatId, content.trim(), 
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
                const messages = chat_store_1.useChatStore.getState().messages;
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = chat_store_1.useChatStore.getState().streamingContent;
                    lastMessage.sources = data.sources;
                    lastMessage.usedTools = data.usedTools;
                    chat_store_1.useChatStore.getState().setMessages([...messages]);
                }
                clearStreaming();
            }, 
            // onError
            (error) => {
                setIsStreaming(false);
                sonner_1.toast.error(error);
                clearStreaming();
            });
        }
        catch (error) {
            setIsStreaming(false);
            sonner_1.toast.error(error.message || 'Failed to send message');
            clearStreaming();
        }
    };
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };
    // Auto-scroll when streaming
    (0, react_1.useEffect)(() => {
        if (isStreaming) {
            scrollToBottom();
        }
    }, [streamingContent, isStreaming]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 h-full overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 flex flex-col min-w-0", children: [(0, jsx_runtime_1.jsx)(scroll_area_1.ScrollArea, { className: "flex-1 px-4", ref: scrollRef, children: (0, jsx_runtime_1.jsx)("div", { className: "max-w-3xl mx-auto py-6", children: messages.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center h-[60vh] text-center", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent", children: "ChatBhaiya" }), (0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground max-w-md", children: "Your AI assistant with web search capabilities. Ask me anything!" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-8 flex gap-2 flex-wrap justify-center", children: ['What is the weather today?', 'Latest AI news', 'Explain quantum computing'].map((prompt) => ((0, jsx_runtime_1.jsx)("button", { onClick: () => handleSendMessage(prompt), className: "px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors", children: prompt }, prompt))) })] })) : ((0, jsx_runtime_1.jsx)(message_list_1.MessageList, { messages: messages, streamingContent: streamingContent, isStreaming: isStreaming })) }) }), (0, jsx_runtime_1.jsx)("div", { className: "border-t bg-background p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-3xl mx-auto", children: [(0, jsx_runtime_1.jsx)(chat_input_1.ChatInput, { onSend: handleSendMessage, disabled: isStreaming, placeholder: "Message ChatBhaiya..." }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-center text-muted-foreground mt-2", children: "ChatBhaiya can make mistakes. Consider checking important information." })] }) })] }), (0, jsx_runtime_1.jsx)(sources_sidebar_1.SourcesSidebar, { sources: sources, isOpen: showSources, onClose: () => setShowSources(false) })] }));
}
//# sourceMappingURL=chat-container.js.map