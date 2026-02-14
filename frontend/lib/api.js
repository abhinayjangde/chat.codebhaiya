"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const axios_1 = __importDefault(require("axios"));
const auth_store_1 = require("@/stores/auth-store");
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
exports.api = axios_1.default.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Request interceptor to add auth token
exports.api.interceptors.request.use((config) => {
    const token = auth_store_1.useAuthStore.getState().getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// Response interceptor to handle token refresh
exports.api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
            const refreshToken = auth_store_1.useAuthStore.getState().getRefreshToken();
            const response = await axios_1.default.post(`${API_URL}/auth/refresh`, {
                refreshToken,
            });
            const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
            const user = auth_store_1.useAuthStore.getState().user;
            auth_store_1.useAuthStore.getState().setAuth(user, {
                accessToken,
                refreshToken: newRefreshToken,
            });
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return (0, exports.api)(originalRequest);
        }
        catch (refreshError) {
            auth_store_1.useAuthStore.getState().logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
        }
    }
    return Promise.reject(error);
});
//# sourceMappingURL=api.js.map