"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatInput = ChatInput;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const textarea_1 = require("@/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
function ChatInput({ onSend, disabled, placeholder = "Message..." }) {
    const [input, setInput] = (0, react_1.useState)('');
    const textareaRef = (0, react_1.useRef)(null);
    const handleSubmit = () => {
        if (!input.trim() || disabled)
            return;
        onSend(input.trim());
        setInput('');
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };
    const handleInputChange = (e) => {
        setInput(e.target.value);
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "relative", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-end gap-2 border rounded-xl bg-background p-2 shadow-sm", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "ghost", size: "icon", className: "shrink-0 h-8 w-8", disabled: disabled, title: "Attach file (coming soon)", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Paperclip, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)(textarea_1.Textarea, { ref: textareaRef, value: input, onChange: handleInputChange, onKeyDown: handleKeyDown, placeholder: placeholder, disabled: disabled, className: (0, utils_1.cn)("min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5", disabled && "opacity-50"), rows: 1 }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", size: "icon", className: (0, utils_1.cn)("shrink-0 h-8 w-8 rounded-lg transition-opacity", !input.trim() || disabled ? "opacity-50" : "opacity-100"), disabled: !input.trim() || disabled, onClick: handleSubmit, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-4 w-4" }) })] }) }));
}
//# sourceMappingURL=chat-input.js.map