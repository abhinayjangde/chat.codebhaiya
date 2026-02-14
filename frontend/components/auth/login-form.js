'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginForm = LoginForm;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const card_1 = require("@/components/ui/card");
const chat_api_1 = require("@/lib/chat-api");
const auth_store_1 = require("@/stores/auth-store");
const sonner_1 = require("sonner");
function LoginForm() {
    const router = (0, navigation_1.useRouter)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const setAuth = (0, auth_store_1.useAuthStore)((state) => state.setAuth);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await chat_api_1.authApi.login(email, password);
            if (response.success) {
                setAuth(response.data.user, response.data.tokens);
                sonner_1.toast.success('Logged in successfully');
                router.push('/');
            }
            else {
                sonner_1.toast.error(response.error || 'Login failed');
            }
        }
        catch (error) {
            sonner_1.toast.error(error.response?.data?.error || 'An error occurred');
        }
        finally {
            setIsLoading(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)(card_1.Card, { className: "w-full max-w-md", children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-2xl font-bold", children: "Login" }), (0, jsx_runtime_1.jsx)(card_1.CardDescription, { children: "Enter your email and password to access your account" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, children: [(0, jsx_runtime_1.jsxs)(card_1.CardContent, { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "email", children: "Email" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "email", type: "email", placeholder: "name@example.com", value: email, onChange: (e) => setEmail(e.target.value), required: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "password", children: "Password" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true })] })] }), (0, jsx_runtime_1.jsxs)(card_1.CardFooter, { className: "flex flex-col space-y-4", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { type: "submit", className: "w-full", disabled: isLoading, children: isLoading ? 'Logging in...' : 'Login' }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-muted-foreground text-center", children: ["Don't have an account?", ' ', (0, jsx_runtime_1.jsx)(link_1.default, { href: "/register", className: "text-primary hover:underline", children: "Register" })] })] })] })] }));
}
//# sourceMappingURL=login-form.js.map