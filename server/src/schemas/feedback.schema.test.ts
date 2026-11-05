import { describe, expect, it } from "vitest";
import { submitFeedbackSchema } from "./feedback.schema.js";

describe("feedback.schema", () => {
  it("accepts valid general feedback", () => {
    const result = submitFeedbackSchema.safeParse({
      type: "feedback",
      message: "The streaming response speed is amazing!",
      rating: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts bug report with metadata and contact email", () => {
    const validChatId = "507f1f77bcf86cd799439011";
    const result = submitFeedbackSchema.safeParse({
      type: "bug_report",
      title: "Code block overflow",
      message: "On mobile screen, Python code blocks overflow horizontally without a scrollbar.",
      contactEmail: "tester@example.com",
      metadata: {
        url: "http://localhost:3000/chat",
        userAgent: "Mozilla/5.0 ...",
        chatId: validChatId,
        screenSize: "390x844",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts feature request with default type", () => {
    const result = submitFeedbackSchema.safeParse({
      message: "Please add LaTeX math preview and PDF export.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("feedback");
    }
  });

  it("rejects message that is too short", () => {
    const result = submitFeedbackSchema.safeParse({
      message: "ok",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email address", () => {
    const result = submitFeedbackSchema.safeParse({
      message: "Good app but found a small bug",
      contactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rating outside 1 to 5", () => {
    const result = submitFeedbackSchema.safeParse({
      message: "Good app",
      rating: 6,
    });
    expect(result.success).toBe(false);
  });
});
