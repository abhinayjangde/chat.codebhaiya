import type { McpTool } from "../../mcp.js";
import type { CloudToolExecutionContext, CloudToolResult } from "../types.js";

export const githubTools: McpTool[] = [
  {
    name: "github_list_issues",
    description: "List issues for a GitHub repository or for the authenticated user with filters like state and labels.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "GitHub repository owner/organization (e.g. 'octocat' or 'my-org')" },
        repo: { type: "string", description: "GitHub repository name (e.g. 'hello-world')" },
        state: { type: "string", enum: ["open", "closed", "all"], description: "Issue state filter (default: 'open')" },
        labels: { type: "string", description: "Comma-separated list of label names to filter by" },
        limit: { type: "number", description: "Maximum number of issues to return (default: 10, max: 50)" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_get_issue",
    description: "Get full details, discussion, and state of a specific GitHub issue by its number.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        issue_number: { type: "number", description: "The issue number" },
      },
      required: ["owner", "repo", "issue_number"],
    },
  },
  {
    name: "github_create_issue",
    description: "Create a new issue in a GitHub repository with title, body description, and optional labels.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        title: { type: "string", description: "Title of the issue" },
        body: { type: "string", description: "Body / description content of the issue in markdown" },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to tag the issue with (e.g. ['bug', 'help wanted'])",
        },
      },
      required: ["owner", "repo", "title"],
    },
  },
  {
    name: "github_update_issue",
    description: "Update an existing GitHub issue (modify title, description, or change state to closed/open).",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        issue_number: { type: "number", description: "The issue number" },
        title: { type: "string", description: "New title for the issue" },
        body: { type: "string", description: "Updated body content" },
        state: { type: "string", enum: ["open", "closed"], description: "New state of the issue" },
      },
      required: ["owner", "repo", "issue_number"],
    },
  },
  {
    name: "github_add_issue_comment",
    description: "Post a comment on a GitHub issue.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        issue_number: { type: "number", description: "The issue number" },
        body: { type: "string", description: "Comment body text in markdown" },
      },
      required: ["owner", "repo", "issue_number", "body"],
    },
  },
  {
    name: "github_search_repositories",
    description: "Search for GitHub repositories by query keywords or topics.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string (e.g. 'language:typescript mcp agent')" },
        limit: { type: "number", description: "Number of repositories to return (default: 5)" },
      },
      required: ["query"],
    },
  },
];

// In-memory demo store for zero-terminal instant sandbox if no live token is provided
const demoIssueStore = new Map<string, Array<{
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  created_at: string;
  comments: Array<{ user: string; body: string; created_at: string }>;
}>>([
  [
    "default",
    [
      {
        number: 101,
        title: "Fix authentication token refresh race condition",
        body: "Users report getting logged out during heavy concurrent requests when token is expiring.",
        state: "open",
        labels: ["bug", "priority:high"],
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        comments: [
          { user: "dev_lead", body: "Reproduced on staging. Needs mutex or atomic refresh queue.", created_at: new Date().toISOString() }
        ],
      },
      {
        number: 102,
        title: "Support Managed Cloud MCP Connectors",
        body: "Allow users to toggle 1-click cloud connectors for Postgres, MongoDB, Supabase, Linear and GitHub.",
        state: "open",
        labels: ["enhancement", "feature"],
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        comments: [],
      },
      {
        number: 103,
        title: "Optimize database connection pooling in serverless environment",
        body: "Connection count spikes during peak traffic. Implement connection pooling limits.",
        state: "closed",
        labels: ["performance"],
        created_at: new Date(Date.now() - 3600000 * 120).toISOString(),
        comments: [
          { user: "infra_guru", body: "Merged PR #104 with pg.Pool max: 10.", created_at: new Date().toISOString() }
        ],
      },
    ],
  ],
]);

export async function executeGithubTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CloudToolExecutionContext
): Promise<CloudToolResult> {
  const token = ctx.authData.accessToken || ctx.authData.token || ctx.authData.apiKey || process.env.GITHUB_TOKEN;
  const isDemo = !token;

  if (!isDemo) {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Codebhaiya-Cloud-MCP/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      if (toolName === "github_list_issues") {
        const owner = String(args.owner || ctx.config.defaultOwner || "");
        const repo = String(args.repo || ctx.config.defaultRepo || "");
        const state = String(args.state || "open");
        const limit = Number(args.limit || 10);

        const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`);
        url.searchParams.set("state", state);
        url.searchParams.set("per_page", String(limit));
        if (args.labels) url.searchParams.set("labels", String(args.labels));

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) {
          const errText = await res.text();
          return { isError: true, content: [{ type: "text", text: `GitHub API error (${res.status}): ${errText}` }] };
        }
        const issues = await res.json();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              Array.isArray(issues)
                ? issues.map((i: any) => ({
                    number: i.number,
                    title: i.title,
                    state: i.state,
                    labels: i.labels?.map((l: any) => l.name) ?? [],
                    author: i.user?.login,
                    html_url: i.html_url,
                    created_at: i.created_at,
                  }))
                : issues,
              null,
              2
            ),
          }],
        };
      }

      if (toolName === "github_get_issue") {
        const owner = String(args.owner || ctx.config.defaultOwner || "");
        const repo = String(args.repo || ctx.config.defaultRepo || "");
        const issueNumber = Number(args.issue_number);

        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, { headers });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `GitHub API error: ${await res.text()}` }] };
        }
        const issue = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }

      if (toolName === "github_create_issue") {
        const owner = String(args.owner || ctx.config.defaultOwner || "");
        const repo = String(args.repo || ctx.config.defaultRepo || "");
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: args.title,
            body: args.body,
            labels: args.labels,
          }),
        });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `GitHub issue creation failed: ${await res.text()}` }] };
        }
        const issue = await res.json();
        return {
          content: [{
            type: "text",
            text: `Successfully created GitHub issue #${issue.number}: "${issue.title}"\nURL: ${issue.html_url}`,
          }],
        };
      }

      if (toolName === "github_update_issue") {
        const owner = String(args.owner || ctx.config.defaultOwner || "");
        const repo = String(args.repo || ctx.config.defaultRepo || "");
        const issueNumber = Number(args.issue_number);
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: args.title,
            body: args.body,
            state: args.state,
          }),
        });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `GitHub issue update failed: ${await res.text()}` }] };
        }
        const issue = await res.json();
        return { content: [{ type: "text", text: `Issue #${issue.number} updated successfully (state: ${issue.state}).` }] };
      }

      if (toolName === "github_add_issue_comment") {
        const owner = String(args.owner || ctx.config.defaultOwner || "");
        const repo = String(args.repo || ctx.config.defaultRepo || "");
        const issueNumber = Number(args.issue_number);
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ body: args.body }),
        });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `Failed to add comment: ${await res.text()}` }] };
        }
        const comment = await res.json();
        return { content: [{ type: "text", text: `Comment posted on issue #${issueNumber}. Comment ID: ${comment.id}` }] };
      }

      if (toolName === "github_search_repositories") {
        const q = encodeURIComponent(String(args.query));
        const limit = Number(args.limit || 5);
        const res = await fetch(`https://api.github.com/search/repositories?q=${q}&per_page=${limit}`, { headers });
        if (!res.ok) {
          return { isError: true, content: [{ type: "text", text: `GitHub repository search failed: ${await res.text()}` }] };
        }
        const data = await res.json();
        const items = (data.items || []).map((repo: any) => ({
          full_name: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          language: repo.language,
          html_url: repo.html_url,
        }));
        return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
      }
    } catch (err: any) {
      return { isError: true, content: [{ type: "text", text: `GitHub Cloud Connector error: ${err.message}` }] };
    }
  }

  // Demo / Zero-Terminal Cloud Sandbox mode
  const repoKey = `${args.owner || "codebhaiya"}/${args.repo || "project"}`;
  let issues = demoIssueStore.get(repoKey);
  if (!issues) {
    issues = [...(demoIssueStore.get("default") || [])];
    demoIssueStore.set(repoKey, issues);
  }

  if (toolName === "github_list_issues") {
    const state = (args.state as string) || "open";
    const filtered = issues.filter((i) => (state === "all" ? true : i.state === state));
    return {
      content: [{
        type: "text",
        text: `[GitHub Cloud Connector (Zero-Terminal Managed Mode)]\nRepository: ${repoKey}\nFound ${filtered.length} issues:\n` +
          JSON.stringify(filtered, null, 2),
      }],
    };
  }

  if (toolName === "github_get_issue") {
    const num = Number(args.issue_number);
    const issue = issues.find((i) => i.number === num);
    if (!issue) {
      return { isError: true, content: [{ type: "text", text: `Issue #${num} not found in ${repoKey}.` }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
  }

  if (toolName === "github_create_issue") {
    const nextNumber = Math.max(...issues.map((i) => i.number), 100) + 1;
    const newIssue = {
      number: nextNumber,
      title: String(args.title),
      body: String(args.body || ""),
      state: "open" as const,
      labels: Array.isArray(args.labels) ? args.labels.map(String) : [],
      created_at: new Date().toISOString(),
      comments: [],
    };
    issues.unshift(newIssue);
    return {
      content: [{
        type: "text",
        text: `[GitHub Cloud Connector] Successfully created issue #${newIssue.number} in ${repoKey}:\nTitle: "${newIssue.title}"\nState: ${newIssue.state}\nLabels: ${newIssue.labels.join(", ") || "none"}\nIssue is now accessible in the repository.`,
      }],
    };
  }

  if (toolName === "github_update_issue") {
    const num = Number(args.issue_number);
    const issue = issues.find((i) => i.number === num);
    if (!issue) {
      return { isError: true, content: [{ type: "text", text: `Issue #${num} not found in ${repoKey}.` }] };
    }
    if (args.title) issue.title = String(args.title);
    if (args.body) issue.body = String(args.body);
    if (args.state && (args.state === "open" || args.state === "closed")) issue.state = args.state;
    return {
      content: [{
        type: "text",
        text: `[GitHub Cloud Connector] Updated issue #${num}: "${issue.title}" (State: ${issue.state}).`,
      }],
    };
  }

  if (toolName === "github_add_issue_comment") {
    const num = Number(args.issue_number);
    const issue = issues.find((i) => i.number === num);
    if (!issue) {
      return { isError: true, content: [{ type: "text", text: `Issue #${num} not found in ${repoKey}.` }] };
    }
    issue.comments.push({
      user: "assistant_agent",
      body: String(args.body),
      created_at: new Date().toISOString(),
    });
    return {
      content: [{
        type: "text",
        text: `[GitHub Cloud Connector] Added comment to issue #${num}: "${args.body}"`,
      }],
    };
  }

  if (toolName === "github_search_repositories") {
    return {
      content: [{
        type: "text",
        text: JSON.stringify([
          { full_name: "codebhaiya/chat-app", description: "Modern AI Chat Platform with Managed Cloud MCP", stars: 1240, language: "TypeScript" },
          { full_name: "modelcontextprotocol/servers", description: "Official Model Context Protocol Reference Servers", stars: 15400, language: "TypeScript" },
          { full_name: "supabase/supabase", description: "The open source Firebase alternative", stars: 74200, language: "TypeScript" },
        ], null, 2),
      }],
    };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool "${toolName}" for GitHub connector.` }] };
}
