import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { McpMarketplace } from "./mcp-marketplace";

describe("McpMarketplace", () => {
  it("renders marketplace search, categories, and loading state", () => {
    const markup = renderToStaticMarkup(
      createElement(McpMarketplace, {
        accessToken: "test-token",
        embedded: true,
      })
    );

    expect(markup).toContain("Managed Cloud MCP Marketplace");
    expect(markup).toContain('placeholder="Search connectors or tools..."');
    expect(markup).toContain("All (0)");
    expect(markup).toContain("Loading Managed Cloud Connectors...");
  });
});
