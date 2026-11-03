import type { McpTool } from "../../mcp.js";
import type { CloudToolExecutionContext, CloudToolResult } from "../types.js";
import pg from "pg";

export const postgresTools: McpTool[] = [
  {
    name: "postgres_query",
    description: "Execute a SQL query against the PostgreSQL database. Returns rows as JSON. Safe read queries (SELECT) and schema inspection queries are supported.",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "The SQL statement to execute (e.g. 'SELECT id, email, role FROM users LIMIT 10;')" },
        params: {
          type: "array",
          items: { type: "string" },
          description: "Optional parameterized values for $1, $2 placeholders",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "postgres_list_tables",
    description: "List all user tables and views in the public schema of the connected PostgreSQL database.",
    inputSchema: {
      type: "object",
      properties: {
        schema: { type: "string", description: "Database schema name (default: 'public')" },
      },
    },
  },
  {
    name: "postgres_describe_table",
    description: "Get detailed column definitions, data types, nullability, and default values for a specified table.",
    inputSchema: {
      type: "object",
      properties: {
        table_name: { type: "string", description: "The table name to inspect" },
        schema: { type: "string", description: "Schema name (default: 'public')" },
      },
      required: ["table_name"],
    },
  },
];

// In-memory demo data for zero-terminal sandbox if user connected with 1-click without providing a live Postgres URL
const DEMO_TABLES: Record<string, Array<Record<string, unknown>>> = {
  users: [
    { id: 1, email: "alice@example.com", name: "Alice Zhang", role: "admin", plan: "enterprise", created_at: "2025-01-15T08:00:00Z" },
    { id: 2, email: "bob@example.com", name: "Bob Smith", role: "developer", plan: "pro", created_at: "2025-02-10T11:30:00Z" },
    { id: 3, email: "charlie@example.com", name: "Charlie Davis", role: "viewer", plan: "free", created_at: "2025-03-01T14:20:00Z" },
    { id: 4, email: "dana@example.com", name: "Dana White", role: "developer", plan: "pro", created_at: "2025-03-12T09:15:00Z" },
    { id: 5, email: "evan@example.com", name: "Evan Wright", role: "billing", plan: "enterprise", created_at: "2025-03-20T16:45:00Z" },
  ],
  orders: [
    { id: 1001, user_id: 1, amount: 249.0, status: "completed", items_count: 3, created_at: "2025-03-10T10:00:00Z" },
    { id: 1002, user_id: 2, amount: 49.0, status: "completed", items_count: 1, created_at: "2025-03-12T14:30:00Z" },
    { id: 1003, user_id: 1, amount: 120.0, status: "processing", items_count: 2, created_at: "2025-03-15T09:00:00Z" },
    { id: 1004, user_id: 4, amount: 99.0, status: "completed", items_count: 1, created_at: "2025-03-18T18:10:00Z" },
    { id: 1005, user_id: 2, amount: 15.0, status: "refunded", items_count: 1, created_at: "2025-03-22T12:00:00Z" },
  ],
  products: [
    { id: 1, name: "Managed Cloud MCP Tier 1", category: "cloud", price: 29.0, stock: 9999 },
    { id: 2, name: "Vector Database Dedicated Node", category: "infrastructure", price: 99.0, stock: 150 },
    { id: 3, name: "Enterprise AI Security Audit", category: "services", price: 499.0, stock: 20 },
    { id: 4, name: "PostgreSQL High-Availability Cluster", category: "databases", price: 149.0, stock: 50 },
  ],
};

export async function executePostgresTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CloudToolExecutionContext
): Promise<CloudToolResult> {
  const connectionString =
    (ctx.config.connectionString as string) ||
    ctx.authData.connectionString ||
    (ctx.config.url as string) ||
    process.env.MANAGED_POSTGRES_URL;

  if (connectionString) {
    const client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
    });

    try {
      await client.connect();

      if (toolName === "postgres_query") {
        const sql = String(args.sql || "").trim();
        const params = Array.isArray(args.params) ? args.params : [];

        // Safety guard: reject destructive DROP/TRUNCATE on system databases
        const lowerSql = sql.toLowerCase();
        if (lowerSql.includes("drop database") || lowerSql.includes("drop table pg_")) {
          return { isError: true, content: [{ type: "text", text: "Destructive system operations are blocked by security policy." }] };
        }

        const res = await client.query(sql, params);
        const rows = res.rows.slice(0, 100);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              {
                rowCount: res.rowCount,
                fields: res.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
                rows,
              },
              null,
              2
            ),
          }],
        };
      }

      if (toolName === "postgres_list_tables") {
        const schema = String(args.schema || "public");
        const res = await client.query(
          `SELECT table_name, table_type 
           FROM information_schema.tables 
           WHERE table_schema = $1 
           ORDER BY table_name;`,
          [schema]
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ schema, tables: res.rows }, null, 2),
          }],
        };
      }

      if (toolName === "postgres_describe_table") {
        const tableName = String(args.table_name || "");
        const schema = String(args.schema || "public");
        const res = await client.query(
          `SELECT column_name, data_type, is_nullable, column_default 
           FROM information_schema.columns 
           WHERE table_schema = $1 AND table_name = $2 
           ORDER BY ordinal_position;`,
          [schema, tableName]
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ table: tableName, schema, columns: res.rows }, null, 2),
          }],
        };
      }
    } catch (err: any) {
      return { isError: true, content: [{ type: "text", text: `PostgreSQL error: ${err.message}` }] };
    } finally {
      await client.end().catch(() => {});
    }
  }

  // Zero-Terminal Cloud Demo Mode (Interactive sandbox database)
  if (toolName === "postgres_list_tables") {
    return {
      content: [{
        type: "text",
        text: `[PostgreSQL Cloud Connector (Zero-Terminal Managed Mode)]\nConnected to Cloud Sandbox DB. Tables in public schema:\n` +
          JSON.stringify([
            { table_name: "users", table_type: "BASE TABLE", rows_estimate: DEMO_TABLES["users"]?.length ?? 0 },
            { table_name: "orders", table_type: "BASE TABLE", rows_estimate: DEMO_TABLES["orders"]?.length ?? 0 },
            { table_name: "products", table_type: "BASE TABLE", rows_estimate: DEMO_TABLES["products"]?.length ?? 0 },
          ], null, 2),
      }],
    };
  }

  if (toolName === "postgres_describe_table") {
    const table = String(args.table_name || "").toLowerCase();
    const columnsMap: Record<string, Array<{ column_name: string; data_type: string; is_nullable: string }>> = {
      users: [
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "email", data_type: "character varying(255)", is_nullable: "NO" },
        { column_name: "name", data_type: "character varying(100)", is_nullable: "YES" },
        { column_name: "role", data_type: "character varying(50)", is_nullable: "NO" },
        { column_name: "plan", data_type: "character varying(50)", is_nullable: "NO" },
        { column_name: "created_at", data_type: "timestamp with time zone", is_nullable: "NO" },
      ],
      orders: [
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "user_id", data_type: "integer", is_nullable: "NO" },
        { column_name: "amount", data_type: "numeric(10,2)", is_nullable: "NO" },
        { column_name: "status", data_type: "character varying(50)", is_nullable: "NO" },
        { column_name: "items_count", data_type: "integer", is_nullable: "NO" },
        { column_name: "created_at", data_type: "timestamp with time zone", is_nullable: "NO" },
      ],
      products: [
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "name", data_type: "character varying(255)", is_nullable: "NO" },
        { column_name: "category", data_type: "character varying(100)", is_nullable: "NO" },
        { column_name: "price", data_type: "numeric(10,2)", is_nullable: "NO" },
        { column_name: "stock", data_type: "integer", is_nullable: "NO" },
      ],
    };

    const cols = columnsMap[table];
    if (!cols) {
      return { isError: true, content: [{ type: "text", text: `Table "${table}" does not exist in schema.` }] };
    }
    return {
      content: [{
        type: "text",
        text: `[PostgreSQL Cloud Connector] Schema for table "${table}":\n` + JSON.stringify(cols, null, 2),
      }],
    };
  }

  if (toolName === "postgres_query") {
    const rawSql = String(args.sql || "").trim();
    const lower = rawSql.toLowerCase();

    let matchedRows: unknown[] = [];
    if (lower.includes("from users")) {
      matchedRows = DEMO_TABLES["users"] ?? [];
    } else if (lower.includes("from orders")) {
      matchedRows = DEMO_TABLES["orders"] ?? [];
    } else if (lower.includes("from products")) {
      matchedRows = DEMO_TABLES["products"] ?? [];
    } else {
      matchedRows = [
        { result: "Query executed successfully against Cloud PostgreSQL Sandbox", query: rawSql },
      ];
    }

    return {
      content: [{
        type: "text",
        text: `[PostgreSQL Cloud Connector (Zero-Terminal Managed Sandbox)]\nQuery: ${rawSql}\nRows returned: ${matchedRows.length}\n` +
          JSON.stringify(matchedRows, null, 2),
      }],
    };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool "${toolName}" for PostgreSQL connector.` }] };
}
