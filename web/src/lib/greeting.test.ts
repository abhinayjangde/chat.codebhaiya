import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firstName, getTimeGreeting } from "./greeting";

describe("greeting utilities", () => {
  describe("firstName", () => {
    it("extracts the first name from full name", () => {
      expect(firstName("Abhishek Kumar")).toBe("Abhishek");
    });

    it("handles single-word names", () => {
      expect(firstName("Alex")).toBe("Alex");
    });

    it("handles extra leading/trailing whitespace", () => {
      expect(firstName("   Jane Doe   ")).toBe("Jane");
    });

    it("returns empty string for null, undefined, or empty string", () => {
      expect(firstName("")).toBe("");
      expect(firstName(null)).toBe("");
      expect(firstName(undefined)).toBe("");
    });
  });

  describe("getTimeGreeting", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 'Good morning' between 05:00 and 11:59", () => {
      vi.setSystemTime(new Date(2026, 10, 2, 8, 30));
      expect(getTimeGreeting()).toBe("Good morning");
    });

    it("returns 'Good afternoon' between 12:00 and 16:59", () => {
      vi.setSystemTime(new Date(2026, 10, 2, 14, 0));
      expect(getTimeGreeting()).toBe("Good afternoon");
    });

    it("returns 'Good evening' between 17:00 and 20:59", () => {
      vi.setSystemTime(new Date(2026, 10, 2, 18, 45));
      expect(getTimeGreeting()).toBe("Good evening");
    });

    it("returns 'Good night' between 21:00 and 04:59", () => {
      vi.setSystemTime(new Date(2026, 10, 2, 23, 15));
      expect(getTimeGreeting()).toBe("Good night");

      vi.setSystemTime(new Date(2026, 10, 2, 3, 0));
      expect(getTimeGreeting()).toBe("Good night");
    });
  });
});
