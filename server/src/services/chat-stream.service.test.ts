import { describe, expect, it } from "vitest";
import {
  getMessageContent,
  getPersistedAttachments,
  parseSearchResults,
  toDocumentSource,
  type ChatAttachment,
} from "./chat-stream.service.js";
import type { RetrievedChunk } from "./retrieval.service.js";

describe("chat-stream.service unit tests", () => {
  describe("getMessageContent", () => {
    it("returns string content as-is", () => {
      expect(getMessageContent("Hello world")).toBe("Hello world");
    });

    it("extracts text from object array chunks", () => {
      const chunks = [
        { text: "First " },
        { text: "Second" },
      ];
      expect(getMessageContent(chunks)).toBe("First Second");
    });

    it("handles plain string array", () => {
      expect(getMessageContent(["foo", "bar"])).toBe("foobar");
    });
  });

  describe("parseSearchResults", () => {
    it("parses structured tool output into search results", () => {
      const output = `[1] TypeScript Official Documentation
URL: https://www.typescriptlang.org
TypeScript extends JavaScript by adding types to the language.

[2] Next.js by Vercel
URL: https://nextjs.org
The React Framework for the Web.`;

      const results = parseSearchResults(output);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        position: 1,
        title: "TypeScript Official Documentation",
        link: "https://www.typescriptlang.org",
        snippet: "TypeScript extends JavaScript by adding types to the language.",
      });
      expect(results[1]).toEqual({
        position: 2,
        title: "Next.js by Vercel",
        link: "https://nextjs.org",
        snippet: "The React Framework for the Web.",
      });
    });

    it("returns empty array for non-matching text", () => {
      expect(parseSearchResults("No results found")).toEqual([]);
    });
  });

  describe("getPersistedAttachments", () => {
    it("strips content from attachments so base64 media is not stored redundantly in MongoDB", () => {
      const attachments: ChatAttachment[] = [
        {
          type: "image",
          name: "screenshot.png",
          mimeType: "image/png",
          size: 512,
          content: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
        },
      ];

      const persisted = getPersistedAttachments(attachments);

      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toEqual({
        type: "image",
        name: "screenshot.png",
        mimeType: "image/png",
        size: 512,
      });
      expect("content" in (persisted[0] as Record<string, unknown>)).toBe(false);
    });
  });

  describe("toDocumentSource", () => {
    it("converts retrieved chunk to document source shape", () => {
      const chunk: RetrievedChunk = {
        documentId: "doc-123",
        filename: "manual.pdf",
        text: "Important instructions on section 2",
        chunkIndex: 3,
        pageNumber: 12,
        score: 0.89,
      };

      const source = toDocumentSource(chunk);

      expect(source).toEqual({
        type: "document",
        title: "manual.pdf",
        snippet: "Important instructions on section 2",
        documentId: "doc-123",
        filename: "manual.pdf",
        chunkIndex: 3,
        pageNumber: 12,
        score: 0.89,
      });
    });
  });
});
