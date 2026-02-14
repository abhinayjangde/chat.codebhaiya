"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageList = MessageList;
const jsx_runtime_1 = require("react/jsx-runtime");
const types_1 = require("@/types");
const message_item_1 = require("./message-item");
function MessageList({ messages, streamingContent, isStreaming }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-6", children: messages.map((message, index) => ((0, jsx_runtime_1.jsx)(message_item_1.MessageItem, { message: message, isStreaming: isStreaming && index === messages.length - 1 && message.role === 'assistant', streamingContent: streamingContent }, index))) }));
}
//# sourceMappingURL=message-list.js.map