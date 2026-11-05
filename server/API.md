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
- Refresh tokens are rotated on every refresh request and the previous token is revoked.
- Logout revokes the current session, invalidating its refresh token and access token.

---

## Endpoints

### Image generation

#### POST /images/generate
Generate and save an image in an existing chat. Requires a Bearer token.

**Request body:**
```json
{
  "chatId": "<chat id>",
  "prompt": "A watercolor illustration of a fox in a pine forest",
  "provider": "google"
}
```

The response includes the persisted image attachment and a data URL for immediate display. Generated image files are stored in the configured S3-compatible storage. The Google provider uses `GOOGLE_IMAGE_MODEL` (default `gemini-3.1-flash-image`) and `GOOGLE_API_KEY`.

Google's image generation API currently requires a paid API tier; generation is free to app users only if the application owner covers provider usage. See [Google's current pricing](https://ai.google.dev/gemini-api/docs/pricing).

### Health

#### GET /health
Readiness and liveness check.

**Response (200 OK):**
```json
{
  "status": "ok",
  "database": "connected",
  "uptimeSeconds": 123,
  "timestamp": "2026-02-15T12:00:00.000Z"
}
```

---

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

**Response (403 Forbidden - Account Pending Deletion):**
```json
{
  "success": false,
  "code": "ACCOUNT_PENDING_DELETION",
  "error": "Your account is deactivated and scheduled for permanent deletion. You can recover your account within 30 days.",
  "deletionScheduledAt": "2026-12-04T06:00:00.000Z"
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
Logout the current session and revoke its tokens.

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

#### PUT /auth/preferences
Update authenticated user preferences.

**Headers:**
```http
Authorization: ******
Content-Type: application/json
```

**Request body:**
```json
{
  "systemInstructions": "Explain code step by step and use TypeScript examples."
}
```

`systemInstructions` is optional in behavior but required in the request schema; send an empty string to clear it. It may contain up to 4,000 characters and applies to future model responses.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "user@example.com",
      "name": "User",
      "preferences": {
        "systemInstructions": "Explain code step by step and use TypeScript examples."
      }
    }
  }
}
```

#### DELETE /auth/account
Schedule user account deletion. This action immediately deactivates the account, revokes all active sessions, and marks all user chats, messages, and uploaded files for permanent deletion after a 30-day grace period. Users cannot access their account while deactivated, but may recover it within 30 days. Requires the confirmation text `"confirm"`.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "confirmation": "confirm"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account scheduled for deletion. You will not be able to access your account now. All data will be deleted in 30 days. You can recover your account within 30 days by logging back in.",
  "data": {
    "deletionScheduledAt": "2026-12-04T06:00:00.000Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Please type \"confirm\" to confirm account deletion"
}
```

#### POST /auth/recover
Recover an account scheduled for deletion within the 30-day grace period. Reactivates the account and returns user data and fresh authentication tokens.

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
  "message": "Welcome back! Your account has been recovered successfully.",
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "email": "user@example.com",
      "name": "John Doe",
      "status": "active",
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

#### PUT /auth/password
Change password for authenticated user.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newPassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Models
 
#### GET /chat/models
List available models based on server configuration.
 
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "groq-llama-3.3-70b",
        "provider": "groq",
        "modelName": "llama-3.3-70b-versatile",
        "displayName": "Llama 3.3 70B (Groq)"
      },
      // ... other available models
    ],
    "default": "groq-llama-3.3-70b"
  }
}
```
 
---
 
### Chats

#### GET /chat
List all chats for the authenticated user, sorted with pinned chats first, then by most recently updated.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `archived` (optional): Set to `true` to list archived chats, or `false` / omit to list active chats (default).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "title": "Architecture Discussion",
        "isPinned": true,
        "isArchived": false,
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
  "message": "Initial message for the chat",
  "model": "groq-llama-3.3-70b" // Optional
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

#### PATCH /chat/:chatId
Update a conversation's title, pinned status, or archive status. At least one field is required.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Renamed Title", // Optional (1-120 chars)
  "isPinned": true,          // Optional (boolean)
  "isArchived": false        // Optional (boolean)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Chat updated successfully",
  "data": {
    "title": "Renamed Title",
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "isPinned": true,
    "isArchived": false,
    "updatedAt": "2026-02-13T10:40:00.000Z"
  }
}
```

#### POST /chat/:chatId/duplicate
Clone an existing conversation along with all its messages and message context.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Chat duplicated successfully",
  "data": {
    "chatId": "65a1b2c3d4e5f6g7h8i9j0k9",
    "title": "Architecture Discussion (Copy)",
    "chat": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k9",
      "userId": "65a1b2c3d4e5f6g7h8i9j0k2",
      "title": "Architecture Discussion (Copy)",
      "isPinned": false,
      "isArchived": false,
      "createdAt": "2026-02-13T10:42:00.000Z",
      "updatedAt": "2026-02-13T10:42:00.000Z"
    }
  }
}
```

#### DELETE /chat/:chatId
Delete a conversation and all its messages permanently.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Chat deleted successfully"
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
{
   "message": "What is the weather today?",
   "model": "groq-llama-3.3-70b" // Optional
 }
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
  "message": "What is the weather today?",
  "model": "groq-llama-3.3-70b", // Optional
  "regenerateMessageId": "65a1b2c3d4e5f6...", // Optional
  "editMessageId": "65a1b2c3d4e5f6..." // Optional
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
data: {"type":"done","messageId":"65a1b2c3d4e5f6...","userMessageId":"65a1b2c3d4e5f7...","sources":[{"title":"Weather Today","link":"https://weather.com"}],"usedTools":[{"name":"web_search","input":{"query":"weather today"}}]}
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

### Documents

#### GET /documents
List the authenticated user's document library, including folder, tags, collection membership, processing status, and version.

#### PATCH /documents/:documentId
Update document organization metadata:
```json
{
  "folder": "Product",
  "tags": ["roadmap", "internal"]
}
```

#### POST /documents/:documentId/version
Upload a replacement file as a new queued document version using multipart field `file`.

#### GET /documents/collections
List the authenticated user's document collections.

#### POST /documents/collections
Create a collection with `name` and optional `description`.

#### PUT /documents/collections/:collectionId/documents
Replace collection membership:
```json
{
  "documentIds": ["65a1b2c3d4e5f6a7b8c9d0e1"]
}
```

#### POST /documents/:documentId/summary
Generate a grounded summary from the document's retrieved chunks.

#### POST /documents/:documentId/questions
Generate document-specific question-and-answer suggestions.

#### GET /documents/:documentId
Get the processing status and metadata for a document owned by the authenticated user.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "document": {
      "documentId": "65a1b2c3d4e5f6a7b8c9d0e1",
      "filename": "guide.pdf",
      "mimeType": "application/pdf",
      "size": 102400,
      "status": "ready",
      "chunkCount": 12,
      "embeddingModel": "gemini-embedding-2",
      "createdAt": "2026-09-04T12:00:00.000Z",
      "updatedAt": "2026-09-04T12:00:15.000Z"
    }
  }
}
```

Possible statuses are `queued`, `processing`, `ready`, and `failed`. Failed documents include an `errorMessage`.

#### DELETE /documents/:documentId
Delete a document owned by the authenticated user. This removes its Qdrant vectors, S3 object, and MongoDB metadata.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": {
    "documentId": "65a1b2c3d4e5f6a7b8c9d0e1"
  }
}
```

Both endpoints return `404` when the document does not exist or belongs to another user.

---

## MCP Connectors & Managed Cloud Marketplace

Users can connect to external Model Context Protocol (MCP) servers so the AI agent can call their tools during chats.
The platform supports two deployment models:
1. **1-Click Managed Cloud Connectors (Zero Terminal Setup)**: Pre-authenticated, cloud-hosted connectors (GitHub Issues, PostgreSQL, MongoDB Atlas, Supabase, Linear, Notion) that users can toggle with OAuth/1-click, requiring no local terminal, CLI, npx, or stdio commands.
2. **Custom STDIO Servers**: Advanced configurations where power users configure a local process (`command` + `args` + `env`).

### GET /mcp/marketplace
List all available Managed Cloud MCP connectors from the cloud marketplace catalog along with their connection status for the authenticated user.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "connectors": [
      {
        "id": "github",
        "name": "GitHub Issues & Code",
        "provider": "GitHub",
        "tagline": "Track issues, inspect repos, and automate developer workflows.",
        "description": "Connect your GitHub account...",
        "category": "Developer Tools",
        "icon": "github",
        "badge": "1-Click OAuth",
        "authTypes": ["oauth", "api_key"],
        "defaultAuthType": "oauth",
        "supportsOneClickOAuth": true,
        "features": ["List open and closed issues", "Create new issues", "Add comments"],
        "samplePrompts": ["Show all open high-priority issues in my repo"],
        "isConnected": true,
        "connectedServerId": "65a1b2c3d4e5f6g7h8i9j0k1",
        "serverName": "GitHub Issues & Code"
      }
    ],
    "totalCount": 6,
    "connectedCount": 1
  }
}
```

### POST /mcp/marketplace/connect
1-Click zero-terminal connection to a managed cloud MCP connector (e.g. GitHub, Postgres, MongoDB Atlas, Supabase, Linear, Notion).

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "connectorId": "postgres",
  "name": "Production PostgreSQL",
  "authType": "connection_string",
  "cloudConfig": {
    "connectionString": "postgresql://user:pass@host:5432/dbname"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully connected PostgreSQL Database!",
  "data": {
    "server": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Production PostgreSQL",
      "serverType": "cloud",
      "cloudConnectorId": "postgres",
      "isActive": true
    },
    "toolCount": 3,
    "tools": [
      { "name": "postgres_query", "description": "Execute a SQL query against PostgreSQL" },
      { "name": "postgres_list_tables", "description": "List all user tables" },
      { "name": "postgres_describe_table", "description": "Inspect column schemas" }
    ]
  }
}
```

### POST /mcp/marketplace/disconnect/:connectorId
1-Click disconnect / remove a cloud connector.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Disconnected postgres connector."
}
```

### GET /mcp/marketplace/oauth/init/:connectorId
Initiate 1-click cloud OAuth handshake for supported providers.

**Headers:**
```http
Authorization: Bearer <access_token>
```

### GET /mcp/servers
List the authenticated user's MCP server configurations.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "servers": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "userId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "name": "GitHub",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "***masked***" },
        "isActive": true,
        "lastConnectedAt": "2026-02-15T12:00:00.000Z",
        "createdAt": "2026-02-14T12:00:00.000Z",
        "updatedAt": "2026-02-14T12:00:00.000Z"
      }
    ]
  }
}
```

### POST /mcp/servers
Register a new MCP server. The server is validated by connecting and listing its tools before saving.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "GitHub",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
  },
  "isActive": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "server": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "GitHub",
      ...
    },
    "toolCount": 12
  }
}
```

### PATCH /mcp/servers/:id
Update an MCP server configuration.

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:** (same fields as POST, all optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "server": { ... }
  }
}
```

### DELETE /mcp/servers/:id
Remove an MCP server configuration and disconnect any active client.

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "MCP server removed"
}
```

### POST /mcp/servers/:id/tools
Connect to an MCP server and list its exposed tools (preview only; connection is closed after).

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "create_issue",
        "description": "Create a new GitHub issue",
        "inputSchema": {
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "body": { "type": "string" },
            "repo": { "type": "string" }
          },
          "required": ["title", "repo"]
        }
      }
    ]
  }
}
```

### Using MCP servers in chats
MCP servers can be attached to a chat by passing `mcpServerIds` (an array of server `_id` strings) in the `/chat` (POST) and `/chat/:chatId/stream` (POST) request bodies. When attached, the MCP server's tools are made available to the LangChain agent alongside web search. MCP tool executions are surfaced in the SSE stream as `tool_start` and `tool_result` events, with the tool name prefixed by `mcp_<serverName>_<toolName>`.

**Example request body:**
```json
{
  "message": "Create an issue for this bug",
  "mcpServerIds": ["65a1b2c3d4e5f6g7h8i9j0k1"]
}
```

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
    language: "english" | "hinglish";
    systemInstructions: string;
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
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
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
