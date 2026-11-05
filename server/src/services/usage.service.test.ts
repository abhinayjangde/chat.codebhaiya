import { describe, expect, it } from "vitest";
import { getUsagePeriod } from "./usage.service.js";

describe("usage.service", () => {
  describe("getUsagePeriod", () => {
    it("formats the calendar month as YYYY-MM", () => {
      expect(getUsagePeriod(new Date("2026-11-05T10:00:00Z"))).toBe("2026-11");
    });

    it("uses UTC regardless of local timezone", () => {
      expect(getUsagePeriod(new Date("2026-01-01T00:00:30Z"))).toBe("2026-01");
      expect(getUsagePeriod(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12");
    });
  });
});
