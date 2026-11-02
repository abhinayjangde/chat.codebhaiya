import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth.schema.js";

describe("auth.schema", () => {
  describe("registerSchema", () => {
    it("accepts valid registration input", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "securePassword123",
        name: "Test User",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
        expect(result.data.name).toBe("Test User");
      }
    });

    it("rejects invalid email addresses", () => {
      const result = registerSchema.safeParse({
        email: "not-an-email",
        password: "securePassword123",
        name: "Test User",
      });

      expect(result.success).toBe(false);
    });

    it("rejects passwords shorter than 8 characters", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "short",
        name: "Test User",
      });

      expect(result.success).toBe(false);
    });

    it("rejects names shorter than 2 characters", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "securePassword123",
        name: "A",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid email and non-empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "   ",
      });

      expect(result.success).toBe(false);
    });
  });
});
