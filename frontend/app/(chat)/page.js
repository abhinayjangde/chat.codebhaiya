'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewChatPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const chat_container_1 = require("@/components/chat/chat-container");
const auth_store_1 = require("@/stores/auth-store");
function NewChatPage() {
    const router = (0, navigation_1.useRouter)();
    const isAuthenticated = (0, auth_store_1.useAuthStore)((state) => state.isAuthenticated);
    (0, react_1.useEffect)(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);
    if (!isAuthenticated) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 flex flex-col h-full", children: (0, jsx_runtime_1.jsx)(chat_container_1.ChatContainer, {}) }));
}
//# sourceMappingURL=page.js.map