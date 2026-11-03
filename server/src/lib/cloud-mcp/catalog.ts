import type { CloudConnectorDefinition } from "./types.js";
import { githubTools } from "./executors/github.executor.js";
import { postgresTools } from "./executors/postgres.executor.js";
import { mongodbTools } from "./executors/mongodb.executor.js";
import { supabaseTools } from "./executors/supabase.executor.js";
import { linearTools } from "./executors/linear.executor.js";
import { notionTools } from "./executors/notion.executor.js";

export const CLOUD_MCP_CATALOG: CloudConnectorDefinition[] = [
  {
    id: "github",
    name: "GitHub Issues & Code",
    provider: "GitHub",
    tagline: "Track issues, inspect repos, and automate developer workflows.",
    description: "Connect your GitHub account to let the assistant search repositories, list open issues, file bug reports, and add comments with zero local git or CLI setup.",
    category: "Developer Tools",
    icon: "github",
    badge: "1-Click OAuth",
    authTypes: ["oauth", "api_key"],
    defaultAuthType: "oauth",
    supportsOneClickOAuth: true,
    features: [
      "List open and closed issues by label or milestone",
      "Create new issues directly from chat conversations",
      "Add discussion comments and close resolved tickets",
      "Search repositories across your organization",
    ],
    samplePrompts: [
      "Show all open high-priority issues in my repo",
      "Create a GitHub issue: 'Fix memory leak in websocket stream'",
      "Add a comment to issue #102 explaining the fix",
    ],
    configFields: [
      {
        key: "defaultOwner",
        label: "Default Owner / Org",
        type: "text",
        placeholder: "e.g. facebook or your-org",
        description: "Default GitHub organization or username for issue operations",
      },
      {
        key: "defaultRepo",
        label: "Default Repository",
        type: "text",
        placeholder: "e.g. react or web-app",
        description: "Default repository name for issue operations",
      },
    ],
    authFields: [
      {
        key: "token",
        label: "Personal Access Token (PAT)",
        type: "password",
        placeholder: "ghp_...",
        description: "GitHub token with repo permissions (or use 1-Click OAuth)",
      },
    ],
    defaultTools: githubTools,
  },
  {
    id: "postgres",
    name: "PostgreSQL Database",
    provider: "PostgreSQL",
    tagline: "Query tables, inspect schemas, and analyze data in PostgreSQL.",
    description: "Securely connect your PostgreSQL database. The assistant can introspect table definitions, inspect relational schemas, and execute read queries directly.",
    category: "Databases",
    icon: "database",
    badge: "1-Click Connect",
    authTypes: ["connection_string", "oauth"],
    defaultAuthType: "connection_string",
    supportsOneClickOAuth: true,
    features: [
      "Inspect schema, tables, and column data types",
      "Run safe SELECT queries and aggregations",
      "Analyze query results and summarize business metrics",
      "Instant Cloud Sandbox mode for testing with zero setup",
    ],
    samplePrompts: [
      "List all tables in the public schema",
      "Describe the schema and columns of the 'users' table",
      "Run query: SELECT id, email, plan FROM users LIMIT 5",
    ],
    configFields: [
      {
        key: "connectionString",
        label: "PostgreSQL Connection URI",
        type: "password",
        placeholder: "postgresql://user:pass@host:5432/dbname?sslmode=require",
        description: "Standard PostgreSQL connection URI (leave empty for instant 1-click cloud sandbox)",
      },
    ],
    authFields: [],
    defaultTools: postgresTools,
  },
  {
    id: "mongodb-atlas",
    name: "MongoDB Atlas",
    provider: "MongoDB",
    tagline: "Query document collections and run aggregation pipelines in Atlas.",
    description: "Connect to your MongoDB Atlas cluster or cloud database. Find documents, inspect inferred JSON schemas, run aggregations, and insert test data without opening a terminal.",
    category: "Databases",
    icon: "leaf",
    badge: "1-Click Connect",
    authTypes: ["connection_string", "oauth"],
    defaultAuthType: "connection_string",
    supportsOneClickOAuth: true,
    features: [
      "List collections and sample document schemas",
      "Execute JSON query filters ($match, $or, $gt)",
      "Run multi-stage aggregation pipelines",
      "Insert new documents into collections safely",
    ],
    samplePrompts: [
      "List all collections in my MongoDB Atlas database",
      "Find all customers where tier is 'enterprise'",
      "Show inferred schema and field types for collection 'customers'",
    ],
    configFields: [
      {
        key: "connectionString",
        label: "MongoDB Atlas Connection String",
        type: "password",
        placeholder: "mongodb+srv://user:pass@cluster.mongodb.net/dbname",
        description: "MongoDB connection URI (leave empty for instant 1-click cloud sandbox)",
      },
      {
        key: "database",
        label: "Database Name",
        type: "text",
        placeholder: "e.g. production or analytics",
        description: "Default database to query",
      },
    ],
    authFields: [],
    defaultTools: mongodbTools,
  },
  {
    id: "supabase",
    name: "Supabase",
    provider: "Supabase",
    tagline: "Query tables, filter data, and trigger RPC functions via PostgREST.",
    description: "Host pre-authenticated Supabase integrations in the cloud. Query rows, insert records, and invoke database functions using your project URL and API key.",
    category: "Databases",
    icon: "zap",
    badge: "1-Click Connect",
    authTypes: ["api_key", "oauth"],
    defaultAuthType: "api_key",
    supportsOneClickOAuth: true,
    features: [
      "Query Supabase tables with PostgREST filters and column selections",
      "Inspect accessible table schemas",
      "Insert rows into database tables",
      "Execute Postgres stored procedures via Supabase RPC",
    ],
    samplePrompts: [
      "Show all available tables in my Supabase project",
      "Query profiles table for users with tier 'pro'",
      "Insert a new row into the 'posts' table",
    ],
    configFields: [
      {
        key: "supabaseUrl",
        label: "Supabase Project URL",
        type: "text",
        placeholder: "https://your-project.supabase.co",
        description: "Your Supabase project URL (leave blank for 1-click cloud sandbox)",
      },
    ],
    authFields: [
      {
        key: "apiKey",
        label: "Supabase Anon / Service Key",
        type: "password",
        placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
        description: "Supabase API key (leave blank for 1-click cloud sandbox)",
      },
    ],
    defaultTools: supabaseTools,
  },
  {
    id: "linear",
    name: "Linear",
    provider: "Linear",
    tagline: "Search issues, file bug tickets, and sync team tasks in Linear.",
    description: "Connect Linear to track sprint cycles, create issues with priorities and assignees, and update task statuses right from your chat prompt.",
    category: "Productivity",
    icon: "layers",
    badge: "1-Click OAuth",
    authTypes: ["oauth", "api_key"],
    defaultAuthType: "oauth",
    supportsOneClickOAuth: true,
    features: [
      "Search workspace issues with team and status filters",
      "Create new Linear tickets with markdown descriptions and priority",
      "Update task progress (Todo, In Progress, Done)",
      "List engineering teams and workflow states",
    ],
    samplePrompts: [
      "List all Linear issues in the ENG team",
      "Create a Linear issue: 'Fix memory leak in stream transport' (Priority: High)",
      "Update issue ENG-101 status to 'Done'",
    ],
    configFields: [],
    authFields: [
      {
        key: "apiKey",
        label: "Linear API Key",
        type: "password",
        placeholder: "lin_api_...",
        description: "Personal Linear API key (or use 1-Click OAuth)",
      },
    ],
    defaultTools: linearTools,
  },
  {
    id: "notion",
    name: "Notion",
    provider: "Notion",
    tagline: "Search workspace docs, query databases, and write new pages in Notion.",
    description: "Integrate Notion with one click. Let the AI search internal documentation, read sprint notes, query databases, and create structured pages without local scripts.",
    category: "Productivity",
    icon: "file-text",
    badge: "1-Click OAuth",
    authTypes: ["oauth", "api_key"],
    defaultAuthType: "oauth",
    supportsOneClickOAuth: true,
    features: [
      "Search across all workspace pages and databases",
      "Read document content and project specifications",
      "Create new documentation pages with formatted text",
      "Query records inside Notion databases",
    ],
    samplePrompts: [
      "Search Notion for 'Architecture Guidelines'",
      "Create a new Notion page titled 'Meeting Notes: Cloud MCP Launch'",
      "Query the 'Sprint Tasks' database in Notion",
    ],
    configFields: [],
    authFields: [
      {
        key: "apiKey",
        label: "Notion Integration Secret",
        type: "password",
        placeholder: "secret_...",
        description: "Internal Integration Secret (or use 1-Click OAuth)",
      },
    ],
    defaultTools: notionTools,
  },
];

export function getConnectorById(id: string): CloudConnectorDefinition | undefined {
  return CLOUD_MCP_CATALOG.find((c) => c.id === id);
}
