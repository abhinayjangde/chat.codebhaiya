import { api } from '@/lib/api';
import { User, AuthTokens, ApiResponse, Chat, Message, PaginatedMessages } from '@/types';

export const authApi = {
  register: async (email: string, password: string, name: string) => {
    const response = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/register',
      { email, password, name }
    );
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/login',
      { email, password }
    );
    return response.data;
  },
  
  refresh: async (refreshToken: string) => {
    const response = await api.post<ApiResponse<{ tokens: AuthTokens }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post<ApiResponse<void>>('/auth/logout');
    return response.data;
  },
  
  me: async () => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },
};

export const chatApi = {
  getChats: async () => {
    const response = await api.get<ApiResponse<{ chats: Chat[] }>>('/chat');
    return response.data;
  },
  
  createChat: async (message: string) => {
    const response = await api.post<ApiResponse<{ title: string; chatId: string }>>(
      '/chat',
      { message }
    );
    return response.data;
  },
  
  getMessages: async (chatId: string, params?: { limit?: number; before?: string; after?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.before) queryParams.append('before', params.before);
    if (params?.after) queryParams.append('after', params.after);
    
    const query = queryParams.toString();
    const url = `/chat/${chatId}/messages${query ? `?${query}` : ''}`;
    
    const response = await api.get<ApiResponse<PaginatedMessages>>(url);
    return response.data;
  },
  
  sendMessage: async (chatId: string, message: string) => {
    const response = await api.post<ApiResponse<{ reply: string }>>(
      `/chat/${chatId}`,
      { message }
    );
    return response.data;
  },
  
  streamMessage: async (
    chatId: string,
    message: string,
    onToken: (token: string) => void,
    onToolStart: (tool: string) => void,
    onSources: (sources: any[]) => void,
    onDone: (data: any) => void,
    onError: (error: string) => void
  ) => {
    const token = useAuthStore.getState().getAccessToken();
    
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
      if (done) break;
      
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
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  },
};

import { useAuthStore } from '@/stores/auth-store';