"use client";
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tooltip = Tooltip;
exports.TooltipTrigger = TooltipTrigger;
exports.TooltipContent = TooltipContent;
exports.TooltipProvider = TooltipProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const radix_ui_1 = require("radix-ui");
const utils_1 = require("@/lib/utils");
function TooltipProvider({ delayDuration = 0, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tooltip.Provider, { "data-slot": "tooltip-provider", delayDuration: delayDuration, ...props }));
}
function Tooltip({ ...props }) {
    return (0, jsx_runtime_1.jsx)(radix_ui_1.Tooltip.Root, { "data-slot": "tooltip", ...props });
}
function TooltipTrigger({ ...props }) {
    return (0, jsx_runtime_1.jsx)(radix_ui_1.Tooltip.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({ className, sideOffset = 0, children, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tooltip.Portal, { children: (0, jsx_runtime_1.jsxs)(radix_ui_1.Tooltip.Content, { "data-slot": "tooltip-content", sideOffset: sideOffset, className: (0, utils_1.cn)("bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance", className), ...props, children: [children, (0, jsx_runtime_1.jsx)(radix_ui_1.Tooltip.Arrow, { className: "bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" })] }) }));
}
//# sourceMappingURL=tooltip.js.map