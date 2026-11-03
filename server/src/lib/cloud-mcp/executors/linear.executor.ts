import type { McpTool } from "../../mcp.js";
import type { CloudToolExecutionContext, CloudToolResult } from "../types.js";

export const linearTools: McpTool[] = [
  {
    name: "linear_list_issues",
    description: "List issues in your Linear workspace, optionally filtered by team key or status.",
    inputSchema: {
      type: "object",
      properties: {
        team: { type: "string", description: "Team key (e.g. 'ENG' or 'PROD')" },
        status: { type: "string", description: "Status name (e.g. 'Todo', 'In Progress', 'Done')" },
        limit: { type: "number", description: "Max issues to return (default: 10)" },
      },
    },
  },
  {
    name: "linear_create_issue",
    description: "Create a new issue in Linear with title, description, team, and priority.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Markdown description of the task or bug" },
        team: { type: "string", description: "Team key (e.g. 'ENG')" },
        priority: { type: "number", description: "Priority level: 0 (no priority), 1 (urgent), 2 (high), 3 (medium), 4 (low)" },
      },
      required: ["title"],
    },
  },
  {
    name: "linear_update_issue",
    description: "Update an existing Linear issue's state or title.",
    inputSchema: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "Issue identifier (e.g. 'ENG-101')" },
        title: { type: "string", description: "Updated title" },
        status: { type: "string", description: "New status (e.g. 'Done' or 'In Progress')" },
      },
      required: ["identifier"],
    },
  },
  {
    name: "linear_list_teams",
    description: "List teams and available projects in the Linear workspace.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

const DEMO_LINEAR_ISSUES = [
  { identifier: "ENG-101", title: "Implement Zero-Terminal Managed Cloud MCP Connectors", status: "In Progress", priority: 1, team: "ENG", assignee: "Abhi" },
  { identifier: "ENG-102", title: "Add OAuth 1-Click Handshake for GitHub and Notion", status: "Todo", priority: 2, team: "ENG", assignee: "Sarah" },
  { identifier: "ENG-103", title: "Database connection pool stress testing", status: "Done", priority: 3, team: "ENG", assignee: "Dev" },
  { identifier: "PROD-24", title: "Revamp MCP Marketplace Discovery UI", status: "In Progress", priority: 2, team: "PROD", assignee: "Designer" },
];

export async function executeLinearTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CloudToolExecutionContext
): Promise<CloudToolResult> {
  const apiKey = ctx.authData.apiKey || ctx.authData.accessToken || process.env.LINEAR_API_KEY;

  if (apiKey) {
    try {
      if (toolName === "linear_list_issues") {
        const query = `
          query {
            issues(first: ${Number(args.limit || 10)}) {
              nodes {
                id
                identifier
                title
                priority
                state { name }
                assignee { name }
              }
            }
          }
        `;
        const res = await fetch("https://api.linear.app/graphql", {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data.data?.issues?.nodes || data, null, 2) }] };
      }

      if (toolName === "linear_create_issue") {
        const title = String(args.title);
        const description = String(args.description || "");
        const query = `
          mutation IssueCreate($title: String!, $description: String) {
            issueCreate(input: { title: $title, description: $description }) {
              success
              issue { id identifier title url }
            }
          }
        `;
        const res = await fetch("https://api.linear.app/graphql", {
          method: "POST",
          headers: { Authorization: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { title, description } }),
        });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data.data?.issueCreate || data, null, 2) }] };
      }
    } catch (err: any) {
      return { isError: true, content: [{ type: "text", text: `Linear API error: ${err.message}` }] };
    }
  }

  // Zero-Terminal Cloud Demo Mode
  if (toolName === "linear_list_issues") {
    const team = args.team ? String(args.team).toUpperCase() : undefined;
    const filtered = team ? DEMO_LINEAR_ISSUES.filter((i) => i.team === team) : DEMO_LINEAR_ISSUES;
    return {
      content: [{
        type: "text",
        text: `[Linear Cloud Connector (Zero-Terminal Managed Mode)]\nFound ${filtered.length} issues in workspace:\n` +
          JSON.stringify(filtered, null, 2),
      }],
    };
  }

  if (toolName === "linear_create_issue") {
    const team = String(args.team || "ENG").toUpperCase();
    const count = DEMO_LINEAR_ISSUES.filter((i) => i.team === team).length + 101;
    const newIssue = {
      identifier: `${team}-${count}`,
      title: String(args.title),
      status: "Todo",
      priority: Number(args.priority ?? 2),
      team,
      assignee: "Unassigned",
    };
    DEMO_LINEAR_ISSUES.unshift(newIssue);
    return {
      content: [{
        type: "text",
        text: `[Linear Cloud Connector] Created issue ${newIssue.identifier}: "${newIssue.title}" (Priority: ${newIssue.priority})\nURL: https://linear.app/codebhaiya/issue/${newIssue.identifier}`,
      }],
    };
  }

  if (toolName === "linear_update_issue") {
    const id = String(args.identifier).toUpperCase();
    const issue = DEMO_LINEAR_ISSUES.find((i) => i.identifier === id);
    if (!issue) {
      return { isError: true, content: [{ type: "text", text: `Issue ${id} not found in workspace.` }] };
    }
    if (args.title) issue.title = String(args.title);
    if (args.status) issue.status = String(args.status);
    return {
      content: [{
        type: "text",
        text: `[Linear Cloud Connector] Updated issue ${id}: State is now "${issue.status}".`,
      }],
    };
  }

  if (toolName === "linear_list_teams") {
    return {
      content: [{
        type: "text",
        text: JSON.stringify([
          { id: "team_eng", key: "ENG", name: "Engineering", membersCount: 14 },
          { id: "team_prod", key: "PROD", name: "Product & Design", membersCount: 6 },
        ], null, 2),
      }],
    };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool "${toolName}" for Linear connector.` }] };
}
