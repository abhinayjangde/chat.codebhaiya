'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSidebar = ChatSidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const scroll_area_1 = require("@/components/ui/scroll-area");
const separator_1 = require("@/components/ui/separator");
const lucide_react_1 = require("lucide-react");
const chat_api_1 = require("@/lib/chat-api");
const auth_store_1 = require("@/stores/auth-store");
const chat_store_1 = require("@/stores/chat-store");
const types_1 = require("@/types");
const sonner_1 = require("sonner");
function ChatSidebar() {
    const router = (0, navigation_1.useRouter)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = (0, react_1.useState)(false);
    const chats = (0, chat_store_1.useChatStore)((state) => state.chats);
    const setChats = (0, chat_store_1.useChatStore)((state) => state.setChats);
    const currentChat = (0, chat_store_1.useChatStore)((state) => state.currentChat);
    const logout = (0, auth_store_1.useAuthStore)((state) => state.logout);
    const user = (0, auth_store_1.useAuthStore)((state) => state.user);
    (0, react_1.useEffect)(() => {
        loadChats();
    }, []);
    const loadChats = async () => {
        try {
            const response = await chat_api_1.chatApi.getChats();
            if (response.success) {
                setChats(response.data.chats);
            }
        }
        catch (error) {
            console.error('Failed to load chats:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleLogout = () => {
        logout();
        sonner_1.toast.success('Logged out successfully');
        router.push('/login');
    };
    const handleNewChat = () => {
        router.push('/');
        setIsMobileMenuOpen(false);
    };
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", className: "fixed top-4 left-4 z-50 lg:hidden", onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { className: "h-6 w-6" }) }), (0, jsx_runtime_1.jsx)("div", { className: `fixed inset-y-0 left-0 z-40 w-64 bg-muted/50 border-r transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-4", children: (0, jsx_runtime_1.jsxs)(button_1.Button, { onClick: handleNewChat, className: "w-full justify-start gap-2", variant: "outline", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-4 w-4" }), "New Chat"] }) }), (0, jsx_runtime_1.jsx)(separator_1.Separator, {}), (0, jsx_runtime_1.jsx)(scroll_area_1.ScrollArea, { className: "flex-1 px-2 py-4", children: isLoading ? ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2 px-2", children: [...Array(5)].map((_, i) => ((0, jsx_runtime_1.jsx)("div", { className: "h-10 bg-muted rounded animate-pulse" }, i))) })) : chats.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "px-4 py-8 text-center text-muted-foreground", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MessageSquare, { className: "h-8 w-8 mx-auto mb-2 opacity-50" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm", children: "No chats yet" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs mt-1", children: "Start a new conversation!" })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-1", children: chats.map((chat) => ((0, jsx_runtime_1.jsx)(link_1.default, { href: `/c/${chat._id}`, onClick: () => setIsMobileMenuOpen(false), children: (0, jsx_runtime_1.jsxs)("div", { className: `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${currentChat?._id === chat._id
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-accent/50'}`, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MessageSquare, { className: "h-4 w-4 shrink-0" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate flex-1", children: chat.title || 'New Chat' })] }) }, chat._id))) })) }), (0, jsx_runtime_1.jsx)(separator_1.Separator, {}), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 space-y-2", children: [user && ((0, jsx_runtime_1.jsxs)("div", { className: "px-2 py-1.5 text-sm text-muted-foreground", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-foreground", children: user.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs truncate", children: user.email })] })), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "ghost", className: "w-full justify-start gap-2 text-muted-foreground", onClick: handleLogout, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.LogOut, { className: "h-4 w-4" }), "Logout"] })] })] }) }), isMobileMenuOpen && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black/50 z-30 lg:hidden", onClick: () => setIsMobileMenuOpen(false) }))] }));
}
//# sourceMappingURL=chat-sidebar.js.map