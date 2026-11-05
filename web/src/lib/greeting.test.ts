import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  firstName,
  formatGreeting,
  getRandomGreeting,
  getTimeGreeting,
  RANDOM_GREETINGS,
} from "./greeting";

describe("greeting utilities", () => {
  describe("RANDOM_GREETINGS", () => {
    it("contains between 5 and 10 greeting options", () => {
      expect(RANDOM_GREETINGS.length).toBeGreaterThanOrEqual(5);
      expect(RANDOM_GREETINGS.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getRandomGreeting", () => {
    it("returns a valid greeting from RANDOM_GREETINGS", () => {
      const greeting = getRandomGreeting();
      expect(RANDOM_GREETINGS).toContain(greeting);
    });

    it("excludes the specified greeting when exclude is provided", () => {
      const exclude = RANDOM_GREETINGS[0];
      for (let i = 0; i < 20; i++) {
        const greeting = getRandomGreeting(exclude);
        expect(greeting).not.toBe(exclude);
        expect(RANDOM_GREETINGS).toContain(greeting);
      }
    });
  });

  describe("formatGreeting", () => {
    it("formats a statement greeting with user first name", () => {
      expect(formatGreeting("Good to see you", "Abhinay Sharma")).toBe(
        "Good to see you, Abhinay"
      );
    });

    it("formats a question greeting with user first name before question mark", () => {
      expect(formatGreeting("What's on your mind?", "Abhinay Sharma")).toBe(
        "What's on your mind, Abhinay?"
      );
    });

    it("returns plain greeting if name is null, undefined, or empty", () => {
      expect(formatGreeting("Welcome back", null)).toBe("Welcome back");
      expect(formatGreeting("Welcome back", undefined)).toBe("Welcome back");
      expect(formatGreeting("Welcome back", "   ")).toBe("Welcome back");
      expect(formatGreeting("What's on your mind?", "")).toBe(
        "What's on your mind?"
      );
    });
  });

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
