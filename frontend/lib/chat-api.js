"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatApi = exports.authApi = void 0;
const api_1 = require("@/lib/api");
const types_1 = require("@/types");
exports.authApi = {
    register: async (email, password, name) => {
        const response = await api_1.api.post('/auth/register', { email, password, name });
        return response.data;
    },
    login: async (email, password) => {
        const response = await api_1.api.post('/auth/login', { email, password });
        return response.data;
    },
    refresh: async (refreshToken) => {
        const response = await api_1.api.post('/auth/refresh', { refreshToken });
        return response.data;
    },
    logout: async () => {
        const response = await api_1.api.post('/auth/logout');
        return response.data;
    },
    me: async () => {
        const response = await api_1.api.get('/auth/me');
        return response.data;
    },
};
exports.chatApi = {
    getChats: async () => {
        const response = await api_1.api.get('/chat');
        return response.data;
    },
    createChat: async (message) => {
        const response = await api_1.api.post('/chat', { message });
        return response.data;
    },
    getMessages: async (chatId, params) => {
        const queryParams = new URLSearchParams();
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.before)
            queryParams.append('before', params.before);
        if (params?.after)
            queryParams.append('after', params.after);
        const query = queryParams.toString();
        const url = `/chat/${chatId}/messages${query ? `?${query}` : ''}`;
        const response = await api_1.api.get(url);
        return response.data;
    },
    sendMessage: async (chatId, message) => {
        const response = await api_1.api.post(`/chat/${chatId}`, { message });
        return response.data;
    },
    streamMessage: async (chatId, message, onToken, onToolStart, onSources, onDone, onError) => {
        const token = auth_store_1.useAuthStore.getState().getAccessToken();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'}/chat/${chatId}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ message }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send message');
        }
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
            throw new Error('No response body');
        }
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        switch (data.type) {
                            case 'token':
                                onToken(data.content);
                                break;
                            case 'tool_start':
                                onToolStart(data.tool);
                                break;
                            case 'sources':
                                onSources(data.sources);
                                break;
                            case 'done':
                                onDone(data);
                                return data;
                            case 'error':
                                onError(data.error);
                                throw new Error(data.error);
                        }
                    }
                    catch (e) {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        }
    },
};
const auth_store_1 = require("@/stores/auth-store");
//# sourceMappingURL=chat-api.js.map