# Chatbot API Documentation

## Base URL
```
http://localhost:9000/api
```

## Authentication

All endpoints except authentication endpoints require a Bearer token in the Authorization header.

```http
Authorization: Bearer <access_token>
```

### Token Lifecycle
- **Access Token**: Valid for 15 minutes
- **Refresh Token**: Valid for 7 days

---

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "user@example.com",
      "name": "John Doe",
      "preferences": {
        "theme": "light",
        "defaultModel": "gpt-5-mini-2025-08-07"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

#### POST /auth/login
Authenticate and get tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "user@example.com",
      "name": "John Doe",
      "preferences": {
        "theme": "light",
        "defaultModel": "gpt-5-mini-2025-08-07"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

#### POST /auth/logout
Logout current user (client should discard tokens).

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me
Get current authenticated user info.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "user@example.com"
    }
  }
}
```

---

### Chats

#### GET /chat
List all chats for the authenticated user.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "title": "Hello!",
        "createdAt": "2026-02-13T10:30:00.000Z",
        "updatedAt": "2026-02-13T10:35:00.000Z"
      }
    ]
  }
}
```

#### POST /chat
Create a new chat.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Initial message for the chat"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "title": "Initial message for the chat",
    "chatId": "65a1b2c3d4e5f6g7h8i9j0k1"
  }
}
```

---

### Messages

#### GET /chat/:chatId/messages
Get paginated messages for a chat.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 20, max: 50)
- `before` (optional): Cursor for pagination (message ID to fetch messages before)
- `after` (optional): Cursor for pagination (message ID to fetch messages after)

**Example Request:**
```http
GET /chat/65a1b2c3d4e5f6g7h8i9j0k1/messages?limit=20&before=65a1b2c3d4e5f6g7h8i9j0k2
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "chatId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k3",
        "role": "user",
        "content": "What is the weather today?",
        "createdAt": "2026-02-13T10:30:00.000Z"
      },
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "chatId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k3",
        "role": "assistant",
        "content": "The weather today is sunny with a high of 72°F.",
        "sources": [
          {
            "title": "Weather Today",
            "url": "https://weather.com",
            "snippet": "Sunny skies expected throughout the day...",
            "position": 1
          }
        ],
        "usedTools": [
          {
            "name": "web_search",
            "input": { "query": "weather today" },
            "output": "[1] Weather Today..."
          }
        ],
        "createdAt": "2026-02-13T10:30:05.000Z"
      }
    ],
    "pagination": {
      "nextCursor": "65a1b2c3d4e5f6g7h8i9j0k1",
      "hasMore": true,
      "total": 150
    }
  }
}
```

#### POST /chat/:chatId
Send a message and get a response (synchronous).

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What is the weather today?"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reply": "The weather today is sunny with a high of 72°F."
  }
}
```

#### POST /chat/:chatId/stream
Send a message and get a streaming response (Server-Sent Events).

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What is the weather today?"
}
```

**Response (SSE Stream):**

The endpoint returns Server-Sent Events with the following event types:

**Event: tool_start**
```
data: {"type":"tool_start","tool":"web_search"}
```

**Event: tool_result**
```
data: {"type":"tool_result","tool":"web_search","output":"[1] Weather Today..."}
```

**Event: sources**
```
data: {"type":"sources","sources":[{"title":"Weather Today","url":"https://weather.com","snippet":"Sunny skies...","position":1}]}
```

**Event: token**
```
data: {"type":"token","content":"The weather today is"}

data: {"type":"token","content":" sunny with a high"}

data: {"type":"token","content":" of 72°F."}
```

**Event: done**
```
data: {"type":"done","sources":[{"title":"Weather Today","link":"https://weather.com"}],"usedTools":[{"name":"web_search","input":{"query":"weather today"}}]}
```

**Event: error**
```
data: {"type":"error","error":"Error message here"}
```

**Example Client Implementation (JavaScript):**
```javascript
const eventSource = new EventSource('/api/chat/65a1b2c3.../stream', {
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ message: 'What is the weather?' })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'token':
      console.log('Token:', data.content);
      break;
    case 'tool_start':
      console.log('Tool started:', data.tool);
      break;
    case 'sources':
      console.log('Sources:', data.sources);
      break;
    case 'done':
      console.log('Complete:', data);
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.error);
      eventSource.close();
      break;
  }
};
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Valid authentication but insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Common Error Messages

- `"Access token required"` - No token provided
- `"Invalid or expired token"` - Token is invalid or expired
- `"User not authenticated"` - User ID not found in token
- `"Chat not found"` - Chat doesn't exist or doesn't belong to user
- `"Message is required"` - Request body missing message field
- `"Email, password, and name are required"` - Registration missing fields
- `"User already exists with this email"` - Email already registered
- `"Invalid credentials"` - Login failed

---

## Rate Limits

Currently, no rate limits are enforced. Rate limiting will be implemented in Phase 2.

---

## Web Search Integration

The AI agent automatically uses web search for:
- Current events and news
- Time-sensitive information
- Questions about recent developments
- Factual queries that may have changed

When web search is used, the response includes:
- **Sources**: Array of citations with title, URL, and snippet
- **Used Tools**: Array of tools executed with inputs and outputs

---

## Data Models

### User
```typescript
{
  _id: ObjectId;
  email: string;
  password: string; // bcrypt hashed
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
  userId: ObjectId;
  title: string;
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
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usedTools?: Array<{
    name: string;
    input: any;
    output: string;
  }>;
  createdAt: Date;
}
```

---

## Environment Variables

Required environment variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini-2025-08-07

# Google Configuration (optional)
GOOGLE_API_KEY=...

# Ollama Configuration
OLLAMA_API_KEY=...

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017/chatbhaiya

# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_REFRESH_SECRET=another-super-secret-key-min-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server Configuration
PORT=9000
```

---

## Quick Start Examples

### 1. Register and Login
```bash
# Register
curl -X POST http://localhost:9000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

### 2. Create Chat and Send Message
```bash
# Create chat
curl -X POST http://localhost:9000/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!"}'

# Send message (sync)
curl -X POST http://localhost:9000/api/chat/<chat-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the weather?"}'
```

### 3. Get Messages with Pagination
```bash
curl "http://localhost:9000/api/chat/<chat-id>/messages?limit=20" \
  -H "Authorization: Bearer <token>"
```

### 4. Stream Response
```bash
curl -X POST http://localhost:9000/api/chat/<chat-id>/stream \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Latest AI news?"}'
```
