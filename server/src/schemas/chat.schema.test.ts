import { describe, expect, it } from "vitest";
import {
  chatMessageSchema,
  createChatSchema,
  renameChatSchema,
} from "./chat.schema.js";
import { paginationQuerySchema } from "./common.schema.js";

describe("chat.schema", () => {
  describe("createChatSchema", () => {
    it("accepts a prompt message", () => {
      const result = createChatSchema.safeParse({
        message: "Hello assistant!",
      });

      expect(result.success).toBe(true);
    });

    it("accepts an attachment when message is empty", () => {
      const validObjectId = "507f1f77bcf86cd799439011";
      const result = createChatSchema.safeParse({
        message: "",
        attachments: [
          {
            type: "document",
            documentId: validObjectId,
            name: "report.pdf",
            mimeType: "application/pdf",
            size: 1024,
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("rejects when both message and attachments are absent", () => {
      const result = createChatSchema.safeParse({
        message: "",
        attachments: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("chatMessageSchema", () => {
    it("accepts message with model and language", () => {
      const result = chatMessageSchema.safeParse({
        message: "Explain recursion in Hindi",
        model: "openai/gpt-oss-20b",
        language: "hinglish",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.language).toBe("hinglish");
      }
    });

    it("validates optional mcpServerIds", () => {
      const validObjectId = "507f1f77bcf86cd799439011";
      const result = chatMessageSchema.safeParse({
        message: "Fetch weather",
        mcpServerIds: [validObjectId],
      });

      expect(result.success).toBe(true);
    });
  });

  describe("renameChatSchema", () => {
    it("accepts valid title", () => {
      const result = renameChatSchema.safeParse({
        title: "Project Architecture Discussion",
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = renameChatSchema.safeParse({
        title: "   ",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("paginationQuerySchema", () => {
    const validObjectId1 = "507f1f77bcf86cd799439011";
    const validObjectId2 = "507f1f77bcf86cd799439012";

    it("accepts limit and before", () => {
      const result = paginationQuerySchema.safeParse({
        limit: "25",
        before: validObjectId1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it("rejects passing both before and after simultaneously", () => {
      const result = paginationQuerySchema.safeParse({
        before: validObjectId1,
        after: validObjectId2,
      });

      expect(result.success).toBe(false);
    });
  });
});
