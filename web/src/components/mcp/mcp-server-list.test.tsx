import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { McpServerList } from "./mcp-server-list";

describe("McpServerList", () => {
  it("renders the Settings-style connector shell and both sections", () => {
    const markup = renderToStaticMarkup(
      createElement(McpServerList, {
        accessToken: "test-token",
        onBack: () => undefined,
      })
    );

    expect(markup).toContain("MCP Connectors");
    expect(markup).toContain("Cloud Marketplace");
    expect(markup).toContain("Custom STDIO");
    expect(markup).toContain('aria-label="MCP connector sections"');
    expect(markup).toContain('aria-label="Back to chat"');
  });
});
