import { describe, expect, it } from "vitest";
import { cloudConnectorConnectSchema, mcpServerSchema } from "./mcp.schema.js";

describe("mcpServerSchema", () => {
  it("validates a valid custom STDIO server config", () => {
    const valid = {
      name: "GitHub Custom",
      serverType: "custom",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: "ghp_12345" },
      isActive: true,
    };
    const parsed = mcpServerSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("fails if custom server does not provide a command", () => {
    const invalid = {
      name: "Custom without command",
      serverType: "custom",
    };
    const parsed = mcpServerSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("allows cloud server without command", () => {
    const validCloud = {
      name: "Managed GitHub",
      serverType: "cloud",
      cloudConnectorId: "github",
      authType: "oauth",
    };
    const parsed = mcpServerSchema.safeParse(validCloud);
    expect(parsed.success).toBe(true);
  });
});

describe("cloudConnectorConnectSchema", () => {
  it("validates valid 1-click cloud connector connection request", () => {
    const valid = {
      connectorId: "postgres",
      name: "Production PostgreSQL",
      authType: "connection_string",
      cloudConfig: { connectionString: "postgresql://user:pass@localhost:5432/mydb" },
    };
    const parsed = cloudConnectorConnectSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("validates 1-click OAuth connector request with defaults", () => {
    const valid = {
      connectorId: "github",
    };
    const parsed = cloudConnectorConnectSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.authType).toBe("oauth");
    }
  });

  it("rejects unknown connectorId", () => {
    const invalid = {
      connectorId: "unknown-database",
    };
    const parsed = cloudConnectorConnectSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
