export interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    theme: 'light' | 'dark';
    defaultModel: string;
  };
}

export interface Chat {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export interface UsedTool {
  name: string;
  input: any;
  output: string;
}

export interface Message {
  _id?: string;
  chatId?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  usedTools?: UsedTool[];
  createdAt?: string;
}

export interface PaginatedMessages {
  messages: Message[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}