# Codebhaiya Architecture

## Overview

Codebhaiya is a full-stack AI chatbot application designed for interactive conversations with support for multiple LLM providers, file attachments, web search, and real-time streaming responses.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS, TypeScript |
| Backend | Express.js 5, TypeScript |
| Database | MongoDB with Mongoose ODM |
| Authentication | JWT (access + refresh tokens) |
| AI/ML | LangChain with multiple providers |
| Deployment | Docker (MongoDB), Render (backend) |

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Next.js   │  │  React 19   │  │  Tailwind CSS      │ │
│  │    App      │  │ Components  │  │  (shadcn/ui)       │ │
│  └──────┬──────┘  └─────────────┘  └──────────┬──────────┘ │
│         │                                      │             │
│         └──────────────┬───────────────────────┘             │
│                        │                                     │
│                  ┌─────▼─────┐                               │
│                  │  api.ts   │ (API Client)                  │
│                  └─────┬─────┘                               │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP/SSE
┌────────────────────────┼─────────────────────────────────────┐
│                        │                                     │
│                  ┌─────▼─────┐      Backend                  │
│                  │  Express  │                              │
│                  │   Server  │                              │
│                  └─────┬─────┘                              │
│         ┌────────────────┼────────────────┐                   │
│         │                │                │                   │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │ Auth Routes  │  │ Chat Routes │  │Upload Routes│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────────┴────────┐       │
│  │Auth Service  │  │Chat Service │  │   Multer         │       │
│  │              │  │Msg Service  │  │   (file upload) │       │
│  └──────┬──────┘  │Search Service│  └──────────────────┘       │
│         │         └──────┬──────┘                              │
│         │                │                                      │
│  ┌──────▼────────────────▼──────┐                              │
│  │       MongoDB (Mongoose)      │                              │
│  │  Users │ Chats │ Messages     │                              │
│  └───────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
                         │
                         │ API Calls
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                     LLM Providers                                │
│  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────────┐        │
│  │  Groq   │  │  Google    │  │ OpenAI  │  │  Ollama  │        │
│  │ (Llama) │  │  Gemini    │  │  GPT-5  │  │   Cloud  │        │
│  └─────────┘  └───────────┘  └─────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Web Search Tool (Tavily)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
chat.codebhaiya/
├── frontend/                    # Next.js 16 application
│   ├── src/
│   │   ├── app/                # App router pages
│   │   │   ├── layout.tsx      # Root layout
│   │   │   ├── page.tsx        # Home page
│   │   │   ├── login/          # Login page
│   │   │   ├── register/      # Registration page
│   │   │   └── forgot-password/
│   │   └── lib/                # Shared utilities
│   │       ├── api.ts          # API client
│   │       ├── types.ts        # TypeScript types
│   │       ├── storage.ts      # Local storage helpers
│   │       ├── utils.ts        # Utility functions
│   │       └── chat-utils.ts   # Chat-specific helpers
│   ├── package.json
│   └── tsconfig.json
│
├── server/                     # Express API server
│   ├── src/
│   │   ├── index.ts            # Entry point
│   │   ├── config/
│   │   │   └── env.ts          # Environment config (Zod)
│   │   ├── routes/             # API routes
│   │   │   ├── auth.route.ts   # Authentication endpoints
│   │   │   ├── chat.route.ts   # Chat & message endpoints
│   │   │   └── upload.route.ts # File upload endpoint
│   │   ├── services/           # Business logic
│   │   │   ├── auth.service.ts # Auth operations
│   │   │   ├── chat.service.ts # Chat title generation
│   │   │   ├── message.service.ts
│   │   │   └── search.service.ts
│   │   ├── models/             # Mongoose models
│   │   │   ├── user.model.ts
│   │   │   ├── chat.model.ts
│   │   │   └── message.model.ts
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   └── lib/
│   │       ├── db.ts           # MongoDB connection
│   │       ├── model.ts        # LLM model factory
│   │       ├── tools.ts        # AI tools (web search)
│   │       └── keep-alive.ts   # Render self-ping
│   ├── package.json
│   ├── tsconfig.json
│   └── API.md                  # API documentation
│
├── docker-compose.yml          # MongoDB container
├── AGENTS.md                   # Agent guidelines
└── architecture.md             # This file
```

## Backend Architecture

### Layered Architecture

The server follows a layered architecture pattern:

```
┌─────────────────────────────┐
│      Routes (Express)        │  Controller layer
│  auth.route.ts              │
│  chat.route.ts              │
│  upload.route.ts            │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│      Services               │  Business logic layer
│  auth.service.ts            │
│  chat.service.ts            │
│  message.service.ts         │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│      Models                 │  Data layer
│  user.model.ts              │
│  chat.model.ts              │
│  message.model.ts           │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│      Database               │
│      MongoDB                │
└─────────────────────────────┘
```

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/password` | PUT | Change password |
| `/api/auth/account` | DELETE | Delete account |
| `/api/chat/models` | GET | List available LLM models |
| `/api/chat` | GET, POST | List/create chats |
| `/api/chat/:chatId` | POST, PATCH, DELETE | Send message/rename/delete chat |
| `/api/chat/:chatId/messages` | GET | Get paginated messages |
| `/api/chat/:chatId/stream` | POST | Streaming response (SSE) |
| `/api/chat/:chatId/pdf` | GET | Export chat as PDF |
| `/api/upload` | POST | Upload file (image/audio/pdf/text) |
| `/api/health` | GET | Health check |

### Authentication Flow

```
┌─────────┐                              ┌─────────┐
│ Client  │                              │ Server  │
└────┬────┘                              └────┬────┘
     │                                        │
     │  POST /api/auth/login                  │
     ├──────────────────────────────────────► │
     │                                        │
     │  { accessToken, refreshToken }         │
     ◄───────────────────────────────────────┤
     │                                        │
     │  GET /api/chat (with Bearer token)    │
     ├──────────────────────────────────────► │
     │                                        │
     │  { chats: [...] }                      │
     ◄───────────────────────────────────────┤
     │                                        │
     │  (After 15 min, access token expires)  │
     │                                        │
     │  POST /api/auth/refresh                │
     ├──────────────────────────────────────► │
     │                                        │
     │  { accessToken, refreshToken }         │
     ◄───────────────────────────────────────┤
```

### LLM Model Architecture

The system supports multiple LLM providers with auto-selection:

```
┌─────────────────────────────────────────────────────────┐
│                    Model Selection                       │
│                    (auto-select)                         │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     ┌─────────┐   ┌──────────┐   ┌──────────┐
     │  Groq   │   │  Gemini  │   │  OpenAI  │
     │ (Llama) │   │  2.5     │   │  GPT-5   │
     └─────────┘   └──────────┘   └──────────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                ┌────────────────┐
                │   LangChain    │
                │    Agent       │
                └───────┬────────┘
                        │
                        ▼
                ┌────────────────┐
                │  Web Search    │
                │    Tool        │
                └────────────────┘
```

**Supported Models:**
- **Groq**: Llama 3.3 70B, Llama 3.1 8B (fast, text-only)
- **Google**: Gemini 2.5 Flash (vision + audio)
- **OpenAI**: GPT-5 Nano (vision + audio)
- **Ollama Cloud**: GLM-5, Kimi K2.5 (vision)

### Streaming Response (SSE)

The `/api/chat/:chatId/stream` endpoint uses Server-Sent Events:

```
Client                                      Server
   │                                           │
   ├──── POST /chat/:chatId/stream ──────────►│
   │                                           │
   │  data: {"type":"tool_start","tool":"..."}│◄── Tool execution started
   │                                           │
   │  data: {"type":"tool_result",...}        │◄── Tool result
   │                                           │
   │  data: {"type":"sources",...}            │◄── Search results
   │                                           │
   │  data: {"type":"token","content":"H"}    │◄── Token stream
   │  data: {"type":"token","content":"e"}    │
   │  data: {"type":"token","content":"ll"}   │
   │                                           │
   │  data: {"type":"done",...}               │◄── Complete
   │                                           │
```

## Frontend Architecture

### Pages

| Route | Description |
|-------|-------------|
| `/` | Main chat interface (requires auth) |
| `/login` | Login page |
| `/register` | Registration page |
| `/forgot-password` | Password reset (UI only) |

### API Client

The `frontend/src/lib/api.ts` provides a typed API client with:
- Automatic token handling
- Response envelope unwrapping
- Error handling with `ApiError` class
- Streaming response support

### State Management

- **Authentication**: Stored in localStorage (access + refresh tokens)
- **User Preferences**: Theme (light/dark), default model
- **Chat State**: Managed via React components with API calls

## Data Models

### User
```typescript
{
  _id: ObjectId;
  email: string;
  password: string;        // bcrypt hashed
  name: string;
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
  userId: ObjectId;       // Ref to User
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message
```typescript
{
  _id: ObjectId;
  chatId: ObjectId;       // Ref to Chat
  userId: ObjectId;       // Ref to User
  role: "user" | "assistant";
  content: string | object;
  modelName?: string;
  attachments?: Array<{
    type: "image" | "document" | "audio";
    content: string;
    name: string;
    mimeType: string;
  }>;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usedTools?: Array<{
    name: string;
    input: object;
    output: string;
  }>;
  createdAt: Date;
}
```

## Environment Variables

### Server
| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 9000) |
| `MONGODB_URL` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret (min 32 chars) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `GROQ_API_KEY` | No | Groq API key |
| `GOOGLE_API_KEY` | No | Google AI API key |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `OLLAMA_API_KEY` | No | Ollama Cloud API key |

### Frontend
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | No | Backend API URL |

## Security

- **Passwords**: Bcrypt hashed (cost factor 12)
- **Tokens**: JWT with short-lived access (15min) and long-lived refresh (7d)
- **CORS**: Configurable origin whitelist
- **File Upload**: Size limit (10MB), type validation
- **Auth Middleware**: Token verification on protected routes

## Development Workflow

### Prerequisites
- Node.js 18+
- pnpm
- MongoDB (via Docker)

### Running the Application

```bash
# Start MongoDB
docker compose up -d mongodb

# Start backend (from server/)
cd server && pnpm dev

# Start frontend (from frontend/)
cd frontend && pnpm dev
```

### Building

```bash
# Backend
cd server && pnpm build

# Frontend
cd frontend && pnpm build
```

## Future Enhancements

See `server/API.md` for planned features:
- Rate limiting (Phase 2)
- Real-time WebSocket support
- Voice input/output
- Plugin system
- Chat sharing
