import { describe, expect, it } from "vitest";
import { parseUserAgentString } from "./auth.service.js";

describe("parseUserAgentString", () => {
  it("should parse Chrome on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const res = parseUserAgentString(ua);
    expect(res.browser).toBe("Chrome");
    expect(res.os).toBe("Windows 10/11");
    expect(res.device).toBe("Desktop");
  });

  it("should parse Safari on macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    const res = parseUserAgentString(ua);
    expect(res.browser).toBe("Safari");
    expect(res.os).toBe("macOS");
    expect(res.device).toBe("Desktop");
  });

  it("should parse Safari on iPhone (Mobile)", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const res = parseUserAgentString(ua);
    expect(res.browser).toBe("Safari");
    expect(res.os).toBe("iOS");
    expect(res.device).toBe("Mobile");
  });

  it("should parse Chrome on Android (Mobile)", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    const res = parseUserAgentString(ua);
    expect(res.browser).toBe("Chrome");
    expect(res.os).toBe("Android");
    expect(res.device).toBe("Mobile");
  });

  it("should handle Firefox on Linux", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0";
    const res = parseUserAgentString(ua);
    expect(res.browser).toBe("Firefox");
    expect(res.os).toBe("Linux");
    expect(res.device).toBe("Desktop");
  });

  it("should handle empty or undefined User-Agent gracefully", () => {
    const res = parseUserAgentString(undefined);
    expect(res.browser).toBe("Unknown browser");
    expect(res.os).toBe("Unknown OS");
    expect(res.device).toBe("Desktop");
  });
});
