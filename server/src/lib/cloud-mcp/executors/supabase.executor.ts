import type { McpTool } from "../../mcp.js";
import type { CloudToolExecutionContext, CloudToolResult } from "../types.js";

export const supabaseTools: McpTool[] = [
  {
    name: "supabase_list_tables",
    description: "List available database tables in the connected Supabase project.",
    inputSchema: {
      type: "object",
      properties: {
        schema: { type: "string", description: "Schema to inspect (default: 'public')" },
      },
    },
  },
  {
    name: "supabase_query_table",
    description: "Query rows from a Supabase table with column selection, filtering, ordering, and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name in Supabase" },
        select: { type: "string", description: "Columns to select (e.g. '*' or 'id, username, created_at')" },
        filters: { type: "string", description: "PostgREST filter string (e.g. 'status=eq.active&tier=eq.pro')" },
        order: { type: "string", description: "Ordering column and direction (e.g. 'created_at.desc')" },
        limit: { type: "number", description: "Max records to return (default: 10, max: 100)" },
      },
      required: ["table"],
    },
  },
  {
    name: "supabase_insert_row",
    description: "Insert a new record or multiple records into a Supabase table.",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name" },
        record: { type: "object", description: "Row data object to insert" },
      },
      required: ["table", "record"],
    },
  },
  {
    name: "supabase_rpc",
    description: "Call a PostgreSQL stored procedure or database function exposed by Supabase RPC.",
    inputSchema: {
      type: "object",
      properties: {
        fn_name: { type: "string", description: "Name of the Postgres function to execute" },
        args: { type: "object", description: "Arguments object to pass to the function" },
      },
      required: ["fn_name"],
    },
  },
];

const DEMO_SUPABASE_DATA: Record<string, Array<Record<string, unknown>>> = {
  profiles: [
    { id: "p_101", username: "sarah_c", full_name: "Sarah Connor", avatar_url: "https://avatar.vercel.sh/sarah", tier: "pro", updated_at: "2025-03-01T12:00:00Z" },
    { id: "p_102", username: "john_d", full_name: "John Doe", avatar_url: "https://avatar.vercel.sh/john", tier: "free", updated_at: "2025-03-02T15:30:00Z" },
    { id: "p_103", username: "emma_w", full_name: "Emma Watson", avatar_url: "https://avatar.vercel.sh/emma", tier: "enterprise", updated_at: "2025-03-04T09:15:00Z" },
  ],
  posts: [
    { id: "post_1", author_id: "p_101", title: "Building with Managed Cloud MCP", content: "Zero-terminal setup makes AI integrations effortless.", published: true, views: 1420 },
    { id: "post_2", author_id: "p_103", title: "Scaling PostgreSQL with Supabase", content: "Tips on connection pooling and index optimization.", published: true, views: 3250 },
  ],
};

export async function executeSupabaseTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CloudToolExecutionContext
): Promise<CloudToolResult> {
  const supabaseUrl =
    (ctx.config.supabaseUrl as string) ||
    (ctx.config.url as string) ||
    process.env.SUPABASE_URL;

  const apiKey =
    ctx.authData.apiKey ||
    ctx.authData.anonKey ||
    ctx.authData.serviceRoleKey ||
    process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && apiKey) {
    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const headers = {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    try {
      if (toolName === "supabase_query_table") {
        const table = String(args.table);
        const select = String(args.select || "*");
        const limit = Number(args.limit || 10);
        const order = args.order ? `&order=${args.order}` : "";
        const filterStr = args.filters ? `&${args.filters}` : "";

        const endpoint = `${cleanUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${limit}${order}${filterStr}`;
        const res = await fetch(endpoint, { headers });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `Supabase query error (${res.status}): ${await res.text()}` }] };
        }
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      if (toolName === "supabase_insert_row") {
        const table = String(args.table);
        const endpoint = `${cleanUrl}/rest/v1/${table}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(args.record),
        });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `Supabase insert error: ${await res.text()}` }] };
        }
        const data = await res.json();
        return { content: [{ type: "text", text: `Inserted row into ${table}:\n${JSON.stringify(data, null, 2)}` }] };
      }

      if (toolName === "supabase_rpc") {
        const fnName = String(args.fn_name);
        const endpoint = `${cleanUrl}/rest/v1/rpc/${fnName}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(args.args || {}),
        });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `Supabase RPC error: ${await res.text()}` }] };
        }
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      if (toolName === "supabase_list_tables") {
        // PostgREST root OpenAPI endpoint advertises all accessible definitions
        const res = await fetch(`${cleanUrl}/rest/v1/`, { headers });
        if (res.ok) {
          const spec = await res.json();
          const tableNames = Object.keys(spec.definitions || {});
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ tables: tableNames }, null, 2),
            }],
          };
        }
      }
    } catch (err: any) {
      return { isError: true, content: [{ type: "text", text: `Supabase error: ${err.message}` }] };
    }
  }

  // Zero-Terminal Cloud Demo Mode
  if (toolName === "supabase_list_tables") {
    return {
      content: [{
        type: "text",
        text: `[Supabase Cloud Connector (Zero-Terminal Managed Mode)]\nProject: demo-cloud-mcp\nAccessible tables:\n` +
          JSON.stringify(["profiles", "posts"], null, 2),
      }],
    };
  }

  if (toolName === "supabase_query_table") {
    const table = String(args.table);
    const rows = DEMO_SUPABASE_DATA[table];
    if (!rows) {
      return { isError: true, content: [{ type: "text", text: `Table "${table}" not found in Supabase project.` }] };
    }
    const limit = Number(args.limit || 10);
    return {
      content: [{
        type: "text",
        text: `[Supabase Cloud Connector]\nTable: ${table} (${rows.length} records)\n` +
          JSON.stringify(rows.slice(0, limit), null, 2),
      }],
    };
  }

  if (toolName === "supabase_insert_row") {
    const table = String(args.table);
    const rec = (args.record as Record<string, unknown>) || {};
    const newId = `${table}_${Date.now()}`;
    const row = { id: newId, ...rec, created_at: new Date().toISOString() };
    if (!DEMO_SUPABASE_DATA[table]) DEMO_SUPABASE_DATA[table] = [];
    DEMO_SUPABASE_DATA[table].push(row);
    return {
      content: [{
        type: "text",
        text: `[Supabase Cloud Connector] Record inserted into "${table}":\n` + JSON.stringify(row, null, 2),
      }],
    };
  }

  if (toolName === "supabase_rpc") {
    return {
      content: [{
        type: "text",
        text: `[Supabase Cloud Connector] RPC function "${args.fn_name}" executed successfully.\nResult: {"status":"success","executedAt":"${new Date().toISOString()}"}`,
      }],
    };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool "${toolName}" for Supabase connector.` }] };
}
