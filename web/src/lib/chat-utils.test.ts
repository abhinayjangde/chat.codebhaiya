import { describe, expect, it } from "vitest";
import {
  formatSourceHost,
  getErrorMessage,
  isAbortError,
  mergeSources,
  mergeUsedTools,
  normalizeSource,
  parseStreamChunk,
  shortTitle,
} from "./chat-utils";
import type { MessageSource, StreamEvent } from "./types";

describe("chat-utils", () => {
  describe("getErrorMessage", () => {
    it("extracts error message from an Error instance", () => {
      expect(getErrorMessage(new Error("Connection timed out"))).toBe(
        "Connection timed out"
      );
    });

    it("returns default message for non-Error values", () => {
      expect(getErrorMessage("unexpected error string")).toBe(
        "Something went wrong. Please try again."
      );
      expect(getErrorMessage(null)).toBe(
        "Something went wrong. Please try again."
      );
    });
  });

  describe("isAbortError", () => {
    it("identifies AbortError instance", () => {
      const abortError = new DOMException("The user aborted a request.", "AbortError");
      expect(isAbortError(abortError)).toBe(true);
    });

    it("identifies Error with 'abort' in message", () => {
      expect(isAbortError(new Error("Request was aborted by user"))).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      expect(isAbortError(new Error("Database connection failed"))).toBe(false);
    });
  });

  describe("shortTitle", () => {
    it("leaves titles <= 52 characters untouched", () => {
      const title = "Short title";
      expect(shortTitle(title)).toBe(title);
    });

    it("truncates titles > 52 characters and appends ellipsis", () => {
      const longTitle = "This is a very long title that exceeds fifty two characters in length easily";
      const truncated = shortTitle(longTitle);
      expect(truncated.endsWith("...")).toBe(true);
      expect(truncated.length).toBe(55); // 52 + 3
    });
  });

  describe("formatSourceHost", () => {
    it("extracts clean domain without www", () => {
      expect(formatSourceHost("https://www.google.com/search?q=test")).toBe("google.com");
      expect(formatSourceHost("https://docs.github.com/en")).toBe("docs.github.com");
    });

    it("falls back to raw string on invalid URL", () => {
      expect(formatSourceHost("not-a-valid-url")).toBe("not-a-valid-url");
    });
  });

  describe("normalizeSource & mergeSources", () => {
    it("normalizes link to url if url is missing", () => {
      const source: MessageSource = {
        type: "web",
        title: "Test",
        link: "https://example.com",
      };
      const normalized = normalizeSource(source);
      expect(normalized.url).toBe("https://example.com");
    });

    it("deduplicates sources by key", () => {
      const source1: MessageSource = {
        type: "web",
        title: "Article 1",
        url: "https://news.com/1",
        position: 1,
      };
      const source2: MessageSource = {
        type: "web",
        title: "Article 1",
        url: "https://news.com/1",
        position: 1,
      };
      const source3: MessageSource = {
        type: "web",
        title: "Article 2",
        url: "https://news.com/2",
        position: 2,
      };

      const merged = mergeSources([source1], [source2, source3]);
      expect(merged).toHaveLength(2);
      expect(merged[0]?.title).toBe("Article 1");
      expect(merged[1]?.title).toBe("Article 2");
    });
  });

  describe("mergeUsedTools", () => {
    it("appends new tool if not seen", () => {
      const tools = mergeUsedTools([], { name: "web_search", input: { query: "vitest" } });
      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe("web_search");
    });

    it("updates existing tool output when tool name and input match", () => {
      const initial = [{ name: "web_search", input: { query: "vitest" } }];
      const updated = mergeUsedTools(initial, {
        name: "web_search",
        input: { query: "vitest" },
        output: "Search results...",
      });

      expect(updated).toHaveLength(1);
      expect(updated[0]?.output).toBe("Search results...");
    });
  });

  describe("parseStreamChunk", () => {
    it("parses valid SSE data event", () => {
      const events: StreamEvent[] = [];
      const chunk = `data: {"type":"token","content":"Hello world"}\n\n`;

      parseStreamChunk(chunk, (event) => events.push(event));

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: "token", content: "Hello world" });
    });

    it("ignores non-data SSE comments or empty lines", () => {
      const events: StreamEvent[] = [];
      const chunk = `: ping comment\n\n`;

      parseStreamChunk(chunk, (event) => events.push(event));

      expect(events).toHaveLength(0);
    });
  });
});
