"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skeleton = Skeleton;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("@/lib/utils");
function Skeleton({ className, ...props }) {
    return ((0, jsx_runtime_1.jsx)("div", { "data-slot": "skeleton", className: (0, utils_1.cn)("bg-accent animate-pulse rounded-md", className), ...props }));
}
//# sourceMappingURL=skeleton.js.map