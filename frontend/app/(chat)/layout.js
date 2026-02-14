"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChatLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const chat_sidebar_1 = require("@/components/sidebar/chat-sidebar");
function ChatLayout({ children, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-screen bg-background", children: [(0, jsx_runtime_1.jsx)(chat_sidebar_1.ChatSidebar, {}), (0, jsx_runtime_1.jsx)("main", { className: "flex-1 flex flex-col overflow-hidden", children: children })] }));
}
//# sourceMappingURL=layout.js.map