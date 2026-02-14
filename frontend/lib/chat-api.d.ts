export declare const authApi: {
    register: (email: string, password: string, name: string) => Promise<any>;
    login: (email: string, password: string) => Promise<any>;
    refresh: (refreshToken: string) => Promise<any>;
    logout: () => Promise<any>;
    me: () => Promise<any>;
};
export declare const chatApi: {
    getChats: () => Promise<any>;
    createChat: (message: string) => Promise<any>;
    getMessages: (chatId: string, params?: {
        limit?: number;
        before?: string;
        after?: string;
    }) => Promise<any>;
    sendMessage: (chatId: string, message: string) => Promise<any>;
    streamMessage: (chatId: string, message: string, onToken: (token: string) => void, onToolStart: (tool: string) => void, onSources: (sources: any[]) => void, onDone: (data: any) => void, onError: (error: string) => void) => Promise<any>;
};
//# sourceMappingURL=chat-api.d.ts.map