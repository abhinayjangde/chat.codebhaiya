"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageItem = MessageItem;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const avatar_1 = require("@/components/ui/avatar");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const lucide_react_1 = require("lucide-react");
const types_1 = require("@/types");
const utils_1 = require("@/lib/utils");
const react_markdown_1 = __importDefault(require("react-markdown"));
function MessageItem({ message, isStreaming, streamingContent }) {
    const [copied, setCopied] = (0, react_1.useState)(false);
    const isUser = message.role === 'user';
    const displayContent = isStreaming && streamingContent ? streamingContent : message.content;
    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('group flex gap-4 px-4 py-6 rounded-lg', isUser ? 'bg-background' : 'bg-muted/50'), children: [(0, jsx_runtime_1.jsx)(avatar_1.Avatar, { className: (0, utils_1.cn)('h-8 w-8 shrink-0', isUser ? 'bg-primary' : 'bg-green-600'), children: (0, jsx_runtime_1.jsx)(avatar_1.AvatarFallback, { className: "text-primary-foreground", children: isUser ? (0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "h-4 w-4" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Bot, { className: "h-4 w-4" }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0 space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-sm", children: isUser ? 'You' : 'ChatBhaiya' }), !isUser && message.content && ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", className: "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity", onClick: handleCopy, children: copied ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { className: "h-4 w-4" })) }))] }), (0, jsx_runtime_1.jsx)("div", { className: "prose prose-sm dark:prose-invert max-w-none", children: isUser ? ((0, jsx_runtime_1.jsx)("p", { className: "whitespace-pre-wrap", children: displayContent })) : ((0, jsx_runtime_1.jsx)(react_markdown_1.default, { components: {
                                p: ({ children }) => (0, jsx_runtime_1.jsx)("p", { className: "whitespace-pre-wrap mb-4", children: children }),
                                code: ({ children }) => ((0, jsx_runtime_1.jsx)("code", { className: "bg-muted px-1.5 py-0.5 rounded text-sm font-mono", children: children })),
                                pre: ({ children }) => ((0, jsx_runtime_1.jsx)("pre", { className: "bg-muted p-4 rounded-lg overflow-x-auto", children: children })),
                            }, children: displayContent })) }), !isUser && message.sources && message.sources.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "pt-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground mb-2", children: "Sources:" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: message.sources.map((source, i) => ((0, jsx_runtime_1.jsxs)("a", { href: source.url, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center gap-1 text-xs bg-background border rounded-full px-2.5 py-1 hover:bg-accent transition-colors", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-muted-foreground", children: ["[", source.position, "]"] }), (0, jsx_runtime_1.jsx)("span", { className: "truncate max-w-[150px]", children: source.title }), (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { className: "h-3 w-3" })] }, i))) })] })), isStreaming && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1 text-muted-foreground", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs", children: "Thinking" }), (0, jsx_runtime_1.jsx)("span", { className: "animate-pulse", children: "..." })] }))] })] }));
}
//# sourceMappingURL=message-item.js.map