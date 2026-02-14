"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const types_1 = require("@/types");
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    user: null,
    tokens: null,
    isAuthenticated: false,
    setAuth: (user, tokens) => {
        set({ user, tokens, isAuthenticated: true });
    },
    logout: () => {
        set({ user: null, tokens: null, isAuthenticated: false });
    },
    getAccessToken: () => {
        return get().tokens?.accessToken || null;
    },
    getRefreshToken: () => {
        return get().tokens?.refreshToken || null;
    },
}), {
    name: 'auth-storage',
}));
//# sourceMappingURL=auth-store.js.map