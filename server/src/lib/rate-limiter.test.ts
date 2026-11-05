import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createRateLimiter, resetRateLimits } from "./rate-limiter.js";

function makeRequest(options: { ip?: string; userId?: string } = {}): Request {
  const headers: Record<string, string> = {};
  if (options.ip) {
    headers["x-forwarded-for"] = options.ip;
  }
  return {
    headers,
    ip: options.ip ?? undefined,
    user: options.userId ? { userId: options.userId } : undefined,
  } as unknown as Request;
}

function makeResponse(): { res: Response; calls: { statuses: number[]; bodies: unknown[] } } {
  const calls = { statuses: [] as number[], bodies: [] as unknown[] };
  const res = {
    setHeader: vi.fn(),
    status(statusCode: number) {
      calls.statuses.push(statusCode);
      return res;
    },
    json(body: unknown) {
      calls.bodies.push(body);
      return res;
    },
  } as unknown as Response;
  return { res, calls };
}

describe("rate-limiter", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests under the limit and sets RateLimit headers", () => {
    const limiter = createRateLimiter({ scope: "test", max: 2, windowMs: 60_000 });
    const req = makeRequest({ ip: "10.0.0.1" });

    for (let i = 0; i < 2; i += 1) {
      const { res, calls } = makeResponse();
      limiter(req, res, () => expect(calls.statuses).toEqual([]));
      expect(res.setHeader).toHaveBeenCalledWith("RateLimit-Limit", "2");
    }
  });

  it("rejects requests above the limit with 429 and Retry-After", () => {
    const limiter = createRateLimiter({ scope: "test", max: 1, windowMs: 60_000 });
    const req = makeRequest({ ip: "10.0.0.2" });

    limiter(req, makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    limiter(req, res, () => {
      throw new Error("Next must not be called when rate limited");
    });

    expect(calls.statuses).toEqual([429]);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "60");
    expect((calls.bodies[0] as { error: unknown }).error).toContain("Too many requests");
  });

  it("keys unauthenticated requests per IP", () => {
    const limiter = createRateLimiter({ scope: "auth", max: 1, windowMs: 60_000 });

    limiter(makeRequest({ ip: "203.0.113.1" }), makeResponse().res, () => {});
    limiter(makeRequest({ ip: "203.0.113.2" }), makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    limiter(makeRequest({ ip: "203.0.113.1" }), res, () => {});
    expect(calls.statuses).toEqual([429]);
  });

  it("ignores raw X-Forwarded-For headers and relies on req.ip to prevent rate-limit bypass", () => {
    const limiter = createRateLimiter({ scope: "auth", max: 1, windowMs: 60_000 });

    const req1 = {
      headers: { "x-forwarded-for": "1.1.1.1" },
      ip: "10.0.0.1",
    } as unknown as Request;

    const req2 = {
      headers: { "x-forwarded-for": "1.1.1.2" }, // Spoofed X-Forwarded-For header
      ip: "10.0.0.1", // Same real client IP determined by Express
    } as unknown as Request;

    limiter(req1, makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    limiter(req2, res, () => {});
    expect(calls.statuses).toEqual([429]);
  });

  it("falls back to socket.remoteAddress or 'unknown' when req.ip is undefined", () => {
    const limiter = createRateLimiter({ scope: "auth", max: 1, windowMs: 60_000 });

    const reqWithSocket = {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as Request;

    limiter(reqWithSocket, makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    limiter(reqWithSocket, res, () => {});
    expect(calls.statuses).toEqual([429]);
  });

  it("keys authenticated requests per user, not per IP", () => {
    const limiter = createRateLimiter({ scope: "chat", max: 1, windowMs: 60_000 });

    limiter(makeRequest({ userId: "user-1" }), makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    limiter(makeRequest({ userId: "user-1" }), res, () => {});
    expect(calls.statuses).toEqual([429]);

    const sameUserDifferentScope = makeRequest({ userId: "user-100" });
    const secondUser = makeResponse();
    limiter(makeRequest({ userId: "user-2" }), secondUser.res, () => {
      expect(secondUser.calls.statuses).toEqual([]);
    });
  });

  it("resets after the window expires", () => {
    const limiter = createRateLimiter({ scope: "test", max: 1, windowMs: 10 });
    const req = makeRequest({ ip: "192.0.2.9" });

    limiter(req, makeResponse().res, () => {});

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const fresh = makeResponse();
        limiter(req, fresh.res, () => {
          expect(fresh.calls.statuses).toEqual([]);
        });
        resolve();
      }, 15);
    });
  });
});
