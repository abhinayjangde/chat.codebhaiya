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
exports.Avatar = Avatar;
exports.AvatarImage = AvatarImage;
exports.AvatarFallback = AvatarFallback;
exports.AvatarBadge = AvatarBadge;
exports.AvatarGroup = AvatarGroup;
exports.AvatarGroupCount = AvatarGroupCount;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const radix_ui_1 = require("radix-ui");
const utils_1 = require("@/lib/utils");
function Avatar({ className, size = "default", ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Avatar.Root, { "data-slot": "avatar", "data-size": size, className: (0, utils_1.cn)("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", className), ...props }));
}
function AvatarImage({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Avatar.Image, { "data-slot": "avatar-image", className: (0, utils_1.cn)("aspect-square size-full", className), ...props }));
}
function AvatarFallback({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Avatar.Fallback, { "data-slot": "avatar-fallback", className: (0, utils_1.cn)("bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs", className), ...props }));
}
function AvatarBadge({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("span", { "data-slot": "avatar-badge", className: (0, utils_1.cn)("bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full ring-2 select-none", "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden", "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2", "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2", className), ...props }));
}
function AvatarGroup({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "avatar-group", className: (0, utils_1.cn)("*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2", className), ...props }));
}
function AvatarGroupCount({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "avatar-group-count", className: (0, utils_1.cn)("bg-muted text-muted-foreground ring-background relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3", className), ...props }));
}
//# sourceMappingURL=avatar.js.map