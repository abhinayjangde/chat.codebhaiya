import { describe, expect, it } from "vitest";
import { CLOUD_MCP_CATALOG, getConnectorById } from "./catalog.js";
import { createMcpClient } from "../mcp.js";
import { CloudMcpClient } from "./cloud-client.js";

describe("Managed Cloud MCP Marketplace Catalog", () => {
  it("includes all requested 1-click cloud connectors", () => {
    const ids = CLOUD_MCP_CATALOG.map((c) => c.id);
    expect(ids).toContain("github");
    expect(ids).toContain("postgres");
    expect(ids).toContain("mongodb-atlas");
    expect(ids).toContain("supabase");
    expect(ids).toContain("linear");
    expect(ids).toContain("notion");
  });

  it("retrieves connector by ID with metadata and default tools", () => {
    const pg = getConnectorById("postgres");
    expect(pg).toBeDefined();
    expect(pg?.category).toBe("Databases");
    expect(pg?.defaultTools.length).toBeGreaterThan(0);

    const gh = getConnectorById("github");
    expect(gh).toBeDefined();
    expect(gh?.category).toBe("Developer Tools");
    expect(gh?.supportsOneClickOAuth).toBe(true);
  });
});

describe("CloudMcpClient and Zero-Terminal Tool Execution", () => {
  it("instantiates CloudMcpClient via createMcpClient for cloud servers", () => {
    const client = createMcpClient({
      _id: "test-cloud-id",
      name: "GitHub Cloud",
      serverType: "cloud",
      cloudConnectorId: "github",
    });
    expect(client).toBeInstanceOf(CloudMcpClient);
  });

  it("executes GitHub Cloud Connector tools with zero terminal setup", async () => {
    const client = createMcpClient({
      _id: "test-gh-id",
      name: "GitHub Cloud",
      serverType: "cloud",
      cloudConnectorId: "github",
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("github_list_issues");
    expect(tools.map((t) => t.name)).toContain("github_create_issue");

    // List issues
    const listRes = await client.callTool("github_list_issues", { owner: "codebhaiya", repo: "chat" });
    expect(listRes.isError).toBeFalsy();
    expect(listRes.content[0]?.text).toContain("Found");

    // Create issue
    const createRes = await client.callTool("github_create_issue", {
      owner: "codebhaiya",
      repo: "chat",
      title: "Add Managed Cloud MCP Support",
      body: "Tested via automated suite.",
    });
    expect(createRes.isError).toBeFalsy();
    expect(createRes.content[0]?.text).toContain("Successfully created issue");
  });

  it("executes PostgreSQL Cloud Connector tools with zero terminal setup", async () => {
    const client = createMcpClient({
      _id: "test-pg-id",
      name: "Postgres Cloud",
      serverType: "cloud",
      cloudConnectorId: "postgres",
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("postgres_query");
    expect(tools.map((t) => t.name)).toContain("postgres_list_tables");

    // List tables in sandbox
    const tablesRes = await client.callTool("postgres_list_tables", {});
    expect(tablesRes.isError).toBeFalsy();
    expect(tablesRes.content[0]?.text).toContain("users");

    // Run safe SELECT query
    const queryRes = await client.callTool("postgres_query", { sql: "SELECT * FROM users LIMIT 2" });
    expect(queryRes.isError).toBeFalsy();
    expect(queryRes.content[0]?.text).toContain("alice@example.com");
  });

  it("executes MongoDB Atlas Cloud Connector tools with zero terminal setup", async () => {
    const client = createMcpClient({
      _id: "test-mongo-id",
      name: "MongoDB Cloud",
      serverType: "cloud",
      cloudConnectorId: "mongodb-atlas",
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("mongodb_list_collections");
    expect(tools.map((t) => t.name)).toContain("mongodb_find_documents");

    const colRes = await client.callTool("mongodb_list_collections", {});
    expect(colRes.isError).toBeFalsy();
    expect(colRes.content[0]?.text).toContain("customers");

    const docsRes = await client.callTool("mongodb_find_documents", { collection: "customers" });
    expect(docsRes.isError).toBeFalsy();
    expect(docsRes.content[0]?.text).toContain("Acme Corp");
  });

  it("executes Supabase Cloud Connector tools with zero terminal setup", async () => {
    const client = createMcpClient({
      _id: "test-sb-id",
      name: "Supabase Cloud",
      serverType: "cloud",
      cloudConnectorId: "supabase",
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("supabase_list_tables");
    expect(tools.map((t) => t.name)).toContain("supabase_query_table");

    const tablesRes = await client.callTool("supabase_list_tables", {});
    expect(tablesRes.isError).toBeFalsy();
    expect(tablesRes.content[0]?.text).toContain("profiles");
  });

  it("executes Linear Cloud Connector tools with zero terminal setup", async () => {
    const client = createMcpClient({
      _id: "test-lin-id",
      name: "Linear Cloud",
      serverType: "cloud",
      cloudConnectorId: "linear",
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("linear_list_issues");
    expect(tools.map((t) => t.name)).toContain("linear_create_issue");

    const issuesRes = await client.callTool("linear_list_issues", { team: "ENG" });
    expect(issuesRes.isError).toBeFalsy();
    expect(issuesRes.content[0]?.text).toContain("ENG-101");
  });

  it("executes Notion Cloud Connector tools with zero terminal setup", async () => {
    const client = createMcpClient({
      _id: "test-notion-id",
      name: "Notion Cloud",
      serverType: "cloud",
      cloudConnectorId: "notion",
    });

    await client.connect();
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("notion_search");
    expect(tools.map((t) => t.name)).toContain("notion_create_page");

    const searchRes = await client.callTool("notion_search", { query: "Architecture" });
    expect(searchRes.isError).toBeFalsy();
    expect(searchRes.content[0]?.text).toContain("Guidelines");
  });
});
