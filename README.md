<div align="center">

# 🤖 Chat Codebhaiya

**A full-stack AI chat platform powered by LangChain, built for Indian developers.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Express](https://img.shields.io/badge/Express-5-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-9-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com)
[![LangChain](https://img.shields.io/badge/LangChain-1.x-1C3C3C?style=for-the-badge)](https://langchain.com)

[Live Demo](https://chat.codebhaiya.com) · [API Docs](./server/API.md) · [Architecture](./architecture.md)

</div>

---

## 📖 Overview

**Chat Codebhaiya** is a production-grade AI chat application with real-time streaming, multi-model support, and multimodal file analysis. It's built with a clean monorepo structure — a **Next.js 16** frontend and a **Node.js/Express** backend — and is designed to make AI accessible to Indian developers with support for both English and **Hinglish** (Hindi+English mix).

The platform intelligently **auto-selects the best AI model** for each query, supports web search grounding, and allows users to attach images, audio, PDFs, and code files directly in chat.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔄 **Real-Time Streaming** | Token-by-token streaming via Server-Sent Events (SSE) |
| 🤖 **Multi-Model AI** | Groq (Llama), Google Gemini, OpenAI GPT, Ollama Cloud |
| ⚡ **Auto Model Selection** | Automatically picks the right model based on query complexity |
| 🌐 **Web Search Grounding** | AI can search the web for up-to-date information |
| 📎 **Multimodal Uploads** | Images, audio, PDFs, and code files (up to 50 MB) |
| 📄 **PDF Export** | Export any chat conversation as a styled PDF |
| 🇮🇳 **Hinglish Mode** | AI responds in a friendly mix of Hindi and English |
| 🔐 **JWT Auth** | Secure access/refresh token pair with 15-min access expiry |
| 🌗 **Dark / Light Theme** | User-level theme preference persisted in MongoDB |
| ♾️ **Infinite Scroll** | Cursor-based paginated message loading |

---

## 🏗️ Architecture

```
chat.codebhaiya/
├── web/            # Next.js 16 Frontend
│   └── src/
│       ├── app/    # App Router (routes, layouts, pages)
│       ├── components/
│       │   ├── chat/          # Chat UI (sidebar, composer, messages)
│       │   └── ui/            # shadcn/ui base components
│       └── lib/    # Shared utilities & API client
│
├── server/         # Express 5 REST API
│   └── src/
│       ├── config/        # Environment validation (Zod)
│       ├── lib/           # DB, LangChain agents, model registry
│       ├── middleware/    # JWT authentication
│       ├── models/        # Mongoose schemas (User, Chat, Message)
│       ├── routes/        # auth, chat, upload
│       └── services/      # Business logic (auth, search, messages)
│
├── docker-compose.yml     # Local MongoDB
└── architecture.md        # Detailed system design doc
```

### Request Flow

```
Browser → Next.js (SSR/Client) → Express API → LangChain Agent
                                                    ↓
                                         Model Registry (Groq / Gemini / OpenAI / Ollama)
                                                    ↓
                                         [optional] Ollama Web Search
                                                    ↓
                                         SSE stream → Browser
```

---

## 🛠️ Tech Stack

### Frontend (`web/`)

| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 | App Router, SSR, routing |
| [React](https://react.dev) | 19 | UI rendering |
| [TypeScript](https://www.typescriptlang.org) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com) | 3 | Component library |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Animations |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10 | Markdown rendering |
| [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) | 16 | Code block highlighting |
| [Lucide React](https://lucide.dev) | 0.5 | Icon set |
| [react-hot-toast](https://react-hot-toast.com) | 2 | Toast notifications |

### Backend (`server/`)

| Technology | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org) | 18+ | Runtime |
| [Express](https://expressjs.com) | 5 | REST API framework |
| [TypeScript](https://www.typescriptlang.org) | 5 | Type safety |
| [LangChain](https://langchain.com) | 1.x | LLM orchestration & agent framework |
| [MongoDB](https://www.mongodb.com) / [Mongoose](https://mongoosejs.com) | 9 | Database & ODM |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6 | Password hashing |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9 | JWT auth |
| [multer](https://github.com/expressjs/multer) | 2 | File uploads |
| [pdf-parse](https://github.com/modesty/pdf-parse) | 1 | PDF text extraction |
| [pdfkit](https://pdfkit.org) | 0.17 | PDF generation |
| [Zod](https://zod.dev) | 4 | Schema validation |

### Supported AI Providers

| Provider | Models | Capabilities |
|---|---|---|
| **Groq** | Llama 3.3 70B, Llama 3.1 8B | Fast text inference |
| **Google** | Gemini 2.5 Flash | Vision, audio, multimodal |
| **OpenAI** | GPT-5 Nano | Vision, audio, multimodal |
| **Ollama Cloud** | GLM-5, Kimi K2.5 | Vision, large context |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** 10+
- **Docker** (for local MongoDB) _or_ a MongoDB Atlas connection string
- At least one LLM API key (Groq is recommended — it has a free tier)

### 1. Clone the repository

```bash
git clone https://github.com/abhinayjangde/chat.codebhaiya.git
cd chat.codebhaiya
```

### 2. Start local MongoDB

```bash
docker compose up -d mongodb
```

### 3. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and fill in your keys:

```env
# Server
PORT=9000
CORS_ORIGINS=http://localhost:3000

# Database
MONGODB_URL=mongodb://abhinayjangde:abhinayjangde@localhost:27017/chatbhaiya?authSource=admin

# Auth — use any 32+ character random strings
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
JWT_REFRESH_SECRET=replace_with_another_long_random_secret_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Password reset email (SMTP; Gmail users should use an App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@example.com
SMTP_PASS=your-provider-app-password
SMTP_FROM=accounts@your-verified-domain.com
APP_BASE_URL=http://localhost:3000

# LLM — add at least one
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
OLLAMA_API_KEY=...
```

### 4. Configure the frontend

```bash
cd ../web
cp .env.example .env.local   # or create .env.local manually
```

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

### 5. Install dependencies & run

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
pnpm install
pnpm dev
# → Server running at http://localhost:9000
```

**Terminal 2 — Frontend:**
```bash
cd web
pnpm install
pnpm dev
# → App running at http://localhost:3000
```

---

## 🤖 AI Model Auto-Selection

One of the standout features of Chat Codebhaiya is its intelligent model router. When the model is set to **Auto** (default), the backend:

1. **Detects attachments** — if images or audio are present, it immediately routes to a multimodal-capable model.
2. **Checks message length** — messages over 1,000 characters are sent to a heavy model.
3. **Classifies intent** — a cheap/fast model is invoked first to classify the query as `SIMPLE` or `COMPLEX`:
   - `SIMPLE` → routed to the cheapest available model (e.g. Llama 3.1 8B on Groq)
   - `COMPLEX` → routed to the best available heavy model (e.g. Llama 3.3 70B or Gemini 2.5 Flash)
4. **Falls back gracefully** — if classification fails, keyword heuristics are applied.

Available models are determined at runtime based on which API keys are present in `server/.env`. You only need **one** key for the app to work.

---

## 📡 API Overview

Base URL: `http://localhost:9000/api`

Authentication uses `Bearer <access_token>` in the `Authorization` header.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health & DB status |
| `POST` | `/auth/register` | — | Create account |
| `POST` | `/auth/login` | — | Get tokens |
| `POST` | `/auth/refresh` | — | Rotate tokens |
| `POST` | `/auth/logout` | ✓ | Invalidate session |
| `GET` | `/auth/me` | ✓ | Current user |
| `PUT` | `/auth/password` | ✓ | Change password |
| `DELETE` | `/auth/account` | ✓ | Delete account |
| `GET` | `/chat/models` | — | Available AI models |
| `GET` | `/chat` | ✓ | List user's chats |
| `POST` | `/chat` | ✓ | Create new chat |
| `GET` | `/chat/:id/messages` | ✓ | Paginated messages |
| `POST` | `/chat/:id` | ✓ | Send message (sync) |
| `POST` | `/chat/:id/stream` | ✓ | Send message (SSE stream) |
| `PATCH` | `/chat/:id` | ✓ | Rename chat |
| `DELETE` | `/chat/:id` | ✓ | Delete chat + messages |
| `GET` | `/chat/:id/pdf` | ✓ | Export chat as PDF |
| `POST` | `/upload` | ✓ | Upload file attachment |

> See [`server/API.md`](./server/API.md) for full request/response schemas.

---

## 📁 File Uploads

The `/api/upload` endpoint handles multimodal attachments with a **50 MB** size limit.

| File Type | Handling |
|---|---|
| Images (`jpg`, `png`, `webp`) | Stored in object storage and sent to the model when referenced |
| Audio (`mp3`, `wav`, etc.) | Stored in object storage and sent to the model when referenced |
| PDFs | Text extracted with `pdf-parse` and appended as document context |
| Code / Text (`.py`, `.ts`, `.js`, `.c`, `.md`, `.csv`, `.log`, etc.) | Read as UTF-8 and appended as document context |

---

## 🔐 Authentication Flow

```
Register / Login
      ↓
  { accessToken (15 min), refreshToken (7 days) }
      ↓
  Client stores tokens
      ↓
  API requests → Authorization: Bearer <accessToken>
      ↓
  When expired → POST /auth/refresh with refreshToken
      ↓
  New token pair issued
```

Passwords are hashed with **bcrypt** (12 salt rounds). Tokens are signed with **HS256** using separate secrets for access and refresh.

---

## 🗃️ Data Models

### User
```typescript
{
  _id: ObjectId;
  email: string;           // unique, indexed, lowercase
  password: string;        // bcrypt hashed, never returned in queries
  name: string;            // 2–50 chars
  preferences: {
    theme: "light" | "dark";
    defaultModel: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Chat
```typescript
{
  _id: ObjectId;
  userId: ObjectId;        // owner reference
  title: string;           // AI-generated from first message
  createdAt: Date;
  updatedAt: Date;
}
```

### Message
```typescript
{
  _id: ObjectId;
  chatId: ObjectId;
  userId: ObjectId;
  role: "user" | "assistant";
  content: string;
  modelName?: string;      // which model generated this response
  attachments?: Attachment[];
  sources?: SearchResult[];     // web search citations
  usedTools?: ToolCall[];       // tool execution trace
  createdAt: Date;
}
```

---

## 🎨 Frontend Pages

| Route | Description |
|---|---|
| `/` | Landing page — animated hero with feature showcase |
| `/login` | Sign in with email & password |
| `/register` | Create a new account |
| `/forgot-password` | Password recovery flow |
| `/chat` | Main chat interface (requires auth) |

The chat interface features:
- **Collapsible sidebar** — chat history, new chat, rename, delete
- **Model selector** — switch between available models mid-conversation
- **Language toggle** — English / Hinglish response mode
- **Composer** — rich input with drag-and-drop file attachment
- **Streaming messages** — live token display with source citation cards
- **Syntax highlighting** — code blocks with copy button
- **Dark / Light mode** — toggleable via the navbar

---

## 🧑‍💻 Development

### Lint

```bash
cd web && pnpm lint
```

### Build for production

```bash
# Backend
cd server && pnpm build && pnpm start

# Frontend
cd web && pnpm build && pnpm start
```

### Smoke test (backend)

```bash
cd server && pnpm smoke:test
```

### Project-level commands

| Command | Where | What it does |
|---|---|---|
| `pnpm dev` | `web/` | Next.js dev server (port 3000) |
| `pnpm build` | `web/` | Production Next.js build |
| `pnpm lint` | `web/` | ESLint (next + TS rules) |
| `pnpm dev` | `server/` | tsc-watch + auto-restart (port 9000) |
| `pnpm build` | `server/` | Compile TS → `dist/` |
| `pnpm start` | `server/` | Run compiled `dist/index.js` |
| `docker compose up -d mongodb` | root | Start local MongoDB |

---

## 🌐 Deployment Notes

- The server includes a **keep-alive self-ping** mechanism (`server/src/lib/keep-alive.ts`) to prevent the API from sleeping on free-tier hosting (e.g. Render). Set the `RENDER_EXTERNAL_URL` env variable to enable it.
- CORS origins are validated as a Set for O(1) lookup; configure `CORS_ORIGINS` as a comma-separated list.
- The `/health` endpoint returns `503` when MongoDB is disconnected — suitable for use as a load-balancer health check.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Follow the coding style — 2-space indent, TypeScript strict, role-based file suffixes
4. Run `pnpm lint` and `pnpm build` in both `web/` and `server/` before committing
5. Use short, lowercase, imperative commit messages: `add streaming support`
6. Open a PR with a clear summary, verification steps, and screenshots for UI changes

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

Built with ❤️ by [Abhinay Jangde](https://github.com/abhinayjangde)

**[chat.codebhaiya.com](https://chat.codebhaiya.com)**

</div>
