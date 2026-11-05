import { describe, expect, it } from "vitest";
import { createSnippet, escapeRegex } from "./chat-search.service.js";

describe("chat-search.service", () => {
  describe("escapeRegex", () => {
    it("escapes regex special characters", () => {
      const input = "What is (c++ [test]* + .?^$|{})?";
      const escaped = escapeRegex(input);
      expect(escaped).toBe("What is \\(c\\+\\+ \\[test\\]\\* \\+ \\.\\?\\^\\$\\|\\{\\}\\)\\?");
    });
  });

  describe("createSnippet", () => {
    it("returns empty string for empty content", () => {
      expect(createSnippet("", "hello")).toBe("");
      expect(createSnippet(null as any, "hello")).toBe("");
    });

    it("returns trimmed content when query is empty", () => {
      expect(createSnippet("Short text", "")).toBe("Short text");
    });

    it("normalizes newlines and extra spaces", () => {
      const content = "Hello\n\nworld!   How    are you\tdoing?";
      const snippet = createSnippet(content, "world", 50);
      expect(snippet).toContain("Hello world! How are you doing?");
    });

    it("creates snippet centered on the matching term with ellipsis", () => {
      const prefix = "A".repeat(100);
      const suffix = "B".repeat(100);
      const content = `${prefix} TARGET_WORD ${suffix}`;
      const snippet = createSnippet(content, "target_word", 40);

      expect(snippet).toContain("TARGET_WORD");
      expect(snippet.startsWith("…")).toBe(true);
      expect(snippet.endsWith("…")).toBe(true);
      expect(snippet.length).toBeLessThanOrEqual(60);
    });

    it("handles match at the very start of content without start ellipsis", () => {
      const content = "Starting message with important keyword here and more content follows";
      const snippet = createSnippet(content, "Starting", 30);

      expect(snippet.startsWith("Starting")).toBe(true);
      expect(snippet.endsWith("…")).toBe(true);
    });

    it("handles match at the very end of content without end ellipsis", () => {
      const content = "Long content starting from the beginning and finishing with end_keyword";
      const snippet = createSnippet(content, "end_keyword", 30);

      expect(snippet.startsWith("…")).toBe(true);
      expect(snippet.endsWith("end_keyword")).toBe(true);
    });
  });
});
