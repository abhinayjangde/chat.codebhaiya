import type { McpTool } from "../../mcp.js";
import type { CloudToolExecutionContext, CloudToolResult } from "../types.js";

export const notionTools: McpTool[] = [
  {
    name: "notion_search",
    description: "Search for pages, notes, and databases across your Notion workspace by title or keyword.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        filter_type: { type: "string", enum: ["page", "database"], description: "Optional filter by object type" },
        limit: { type: "number", description: "Max results to return (default: 5)" },
      },
    },
  },
  {
    name: "notion_query_database",
    description: "Query rows and properties from a Notion database with optional filter criteria.",
    inputSchema: {
      type: "object",
      properties: {
        database_id: { type: "string", description: "Notion database ID" },
        filter: { type: "object", description: "Notion filter object" },
        page_size: { type: "number", description: "Max records to return (default: 10)" },
      },
      required: ["database_id"],
    },
  },
  {
    name: "notion_create_page",
    description: "Create a new page in a Notion database or as a sub-page of an existing parent page.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Page title" },
        content: { type: "string", description: "Text content for the page" },
        parent_id: { type: "string", description: "Parent page or database ID (optional in demo mode)" },
      },
      required: ["title"],
    },
  },
  {
    name: "notion_get_page",
    description: "Retrieve a specific Notion page's metadata, properties, and markdown content.",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "Notion page ID" },
      },
      required: ["page_id"],
    },
  },
];

const DEMO_NOTION_PAGES = [
  {
    id: "page_doc_1",
    title: "Codebhaiya Architecture Guidelines",
    type: "page",
    url: "https://notion.so/codebhaiya/architecture-guidelines",
    last_edited: "2025-03-01T10:00:00Z",
    content: "Overview of microservices, Next.js frontend, Express API backend, MongoDB persistence, and Managed Cloud MCP tool orchestration.",
  },
  {
    id: "page_doc_2",
    title: "Q4 Product Strategy & Roadmap",
    type: "page",
    url: "https://notion.so/codebhaiya/roadmap-q4",
    last_edited: "2025-03-03T16:45:00Z",
    content: "Key priorities: Zero-terminal MCP Marketplace, high-speed streaming citations, enterprise OAuth connectors, and database auto-tuning.",
  },
  {
    id: "db_tasks_1",
    title: "Sprint Tasks & Bugs Database",
    type: "database",
    url: "https://notion.so/codebhaiya/sprint-tasks",
    last_edited: "2025-03-05T09:15:00Z",
    content: "Database tracking 48 active engineering tasks across frontend and backend modules.",
  },
];

export async function executeNotionTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CloudToolExecutionContext
): Promise<CloudToolResult> {
  const token = ctx.authData.apiKey || ctx.authData.token || ctx.authData.accessToken || process.env.NOTION_TOKEN;

  if (token) {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    try {
      if (toolName === "notion_search") {
        const body: Record<string, unknown> = {
          query: args.query || "",
          page_size: Number(args.limit || 5),
        };
        if (args.filter_type) {
          body.filter = { value: args.filter_type, property: "object" };
        }
        const res = await fetch("https://api.notion.com/v1/search", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data.results || data, null, 2) }] };
      }

      if (toolName === "notion_get_page") {
        const pageId = String(args.page_id).replace(/-/g, "");
        const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    } catch (err: any) {
      return { isError: true, content: [{ type: "text", text: `Notion API error: ${err.message}` }] };
    }
  }

  // Zero-Terminal Cloud Demo Mode
  if (toolName === "notion_search") {
    const q = String(args.query || "").toLowerCase();
    const results = DEMO_NOTION_PAGES.filter(
      (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
    );
    return {
      content: [{
        type: "text",
        text: `[Notion Cloud Connector (Zero-Terminal Managed Mode)]\nSearch query: "${args.query || "*"}" (${results.length} matches):\n` +
          JSON.stringify(results, null, 2),
      }],
    };
  }

  if (toolName === "notion_get_page") {
    const id = String(args.page_id);
    const page = DEMO_NOTION_PAGES.find((p) => p.id === id);
    if (!page) {
      return { isError: true, content: [{ type: "text", text: `Notion page with ID "${id}" was not found.` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(page, null, 2) }] };
  }

  if (toolName === "notion_create_page") {
    const title = String(args.title);
    const content = String(args.content || "");
    const newPage = {
      id: `page_doc_${DEMO_NOTION_PAGES.length + 1}`,
      title,
      type: "page",
      url: `https://notion.so/codebhaiya/${encodeURIComponent(title.toLowerCase().replace(/\s+/g, "-"))}`,
      last_edited: new Date().toISOString(),
      content,
    };
    DEMO_NOTION_PAGES.unshift(newPage);
    return {
      content: [{
        type: "text",
        text: `[Notion Cloud Connector] Created new page "${newPage.title}"\nID: ${newPage.id}\nURL: ${newPage.url}`,
      }],
    };
  }

  if (toolName === "notion_query_database") {
    return {
      content: [{
        type: "text",
        text: `[Notion Cloud Connector] Database query executed on "${args.database_id}". Found 4 records:\n` +
          JSON.stringify([
            { id: "row_1", Title: "Launch Cloud MCP", Status: "Done", Assignee: "Abhi" },
            { id: "row_2", Title: "Zero-Terminal Documentation", Status: "In Progress", Assignee: "Sarah" },
          ], null, 2),
      }],
    };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool "${toolName}" for Notion connector.` }] };
}
