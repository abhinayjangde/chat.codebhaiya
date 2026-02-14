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
exports.DropdownMenu = DropdownMenu;
exports.DropdownMenuPortal = DropdownMenuPortal;
exports.DropdownMenuTrigger = DropdownMenuTrigger;
exports.DropdownMenuContent = DropdownMenuContent;
exports.DropdownMenuGroup = DropdownMenuGroup;
exports.DropdownMenuLabel = DropdownMenuLabel;
exports.DropdownMenuItem = DropdownMenuItem;
exports.DropdownMenuCheckboxItem = DropdownMenuCheckboxItem;
exports.DropdownMenuRadioGroup = DropdownMenuRadioGroup;
exports.DropdownMenuRadioItem = DropdownMenuRadioItem;
exports.DropdownMenuSeparator = DropdownMenuSeparator;
exports.DropdownMenuShortcut = DropdownMenuShortcut;
exports.DropdownMenuSub = DropdownMenuSub;
exports.DropdownMenuSubTrigger = DropdownMenuSubTrigger;
exports.DropdownMenuSubContent = DropdownMenuSubContent;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const radix_ui_1 = require("radix-ui");
const utils_1 = require("@/lib/utils");
function DropdownMenu({ ...props }) {
    return (0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Root, { "data-slot": "dropdown-menu", ...props });
}
function DropdownMenuPortal({ ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Portal, { "data-slot": "dropdown-menu-portal", ...props }));
}
function DropdownMenuTrigger({ ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Trigger, { "data-slot": "dropdown-menu-trigger", ...props }));
}
function DropdownMenuContent({ className, sideOffset = 4, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Portal, { children: (0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Content, { "data-slot": "dropdown-menu-content", sideOffset: sideOffset, className: (0, utils_1.cn)("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md", className), ...props }) }));
}
function DropdownMenuGroup({ ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Group, { "data-slot": "dropdown-menu-group", ...props }));
}
function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Item, { "data-slot": "dropdown-menu-item", "data-inset": inset, "data-variant": variant, className: (0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props }));
}
function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
    return ((0, jsx_runtime_1.jsxs)(radix_ui_1.DropdownMenu.CheckboxItem, { "data-slot": "dropdown-menu-checkbox-item", className: (0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), checked: checked, ...props, children: [(0, jsx_runtime_1.jsx)("span", { className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center", children: (0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.ItemIndicator, { children: (0, jsx_runtime_1.jsx)(lucide_react_1.CheckIcon, { className: "size-4" }) }) }), children] }));
}
function DropdownMenuRadioGroup({ ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.RadioGroup, { "data-slot": "dropdown-menu-radio-group", ...props }));
}
function DropdownMenuRadioItem({ className, children, ...props }) {
    return ((0, jsx_runtime_1.jsxs)(radix_ui_1.DropdownMenu.RadioItem, { "data-slot": "dropdown-menu-radio-item", className: (0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [(0, jsx_runtime_1.jsx)("span", { className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center", children: (0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.ItemIndicator, { children: (0, jsx_runtime_1.jsx)(lucide_react_1.CircleIcon, { className: "size-2 fill-current" }) }) }), children] }));
}
function DropdownMenuLabel({ className, inset, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Label, { "data-slot": "dropdown-menu-label", "data-inset": inset, className: (0, utils_1.cn)("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className), ...props }));
}
function DropdownMenuSeparator({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Separator, { "data-slot": "dropdown-menu-separator", className: (0, utils_1.cn)("bg-border -mx-1 my-1 h-px", className), ...props }));
}
function DropdownMenuShortcut({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("span", { "data-slot": "dropdown-menu-shortcut", className: (0, utils_1.cn)("text-muted-foreground ml-auto text-xs tracking-widest", className), ...props }));
}
function DropdownMenuSub({ ...props }) {
    return (0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Sub, { "data-slot": "dropdown-menu-sub", ...props });
}
function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
    return ((0, jsx_runtime_1.jsxs)(radix_ui_1.DropdownMenu.SubTrigger, { "data-slot": "dropdown-menu-sub-trigger", "data-inset": inset, className: (0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props, children: [children, (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRightIcon, { className: "ml-auto size-4" })] }));
}
function DropdownMenuSubContent({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.SubContent, { "data-slot": "dropdown-menu-sub-content", className: (0, utils_1.cn)("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg", className), ...props }));
}
//# sourceMappingURL=dropdown-menu.js.map