import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import {
  closeRateLimiter,
  createRateLimiter,
  getRedisClient,
  resetRateLimits,
} from "./rate-limiter.js";

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
  beforeEach(async () => {
    await resetRateLimits();
  });

  afterAll(async () => {
    await closeRateLimiter();
  });

  it("allows requests under the limit and sets RateLimit headers", async () => {
    const limiter = createRateLimiter({ scope: "test", max: 2, windowMs: 60_000 });
    const req = makeRequest({ ip: "10.0.0.1" });

    for (let i = 0; i < 2; i += 1) {
      const { res, calls } = makeResponse();
      await limiter(req, res, () => expect(calls.statuses).toEqual([]));
      expect(res.setHeader).toHaveBeenCalledWith("RateLimit-Limit", "2");
    }
  });

  it("rejects requests above the limit with 429 and Retry-After", async () => {
    const limiter = createRateLimiter({ scope: "test", max: 1, windowMs: 60_000 });
    const req = makeRequest({ ip: "10.0.0.2" });

    await limiter(req, makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    await limiter(req, res, () => {
      throw new Error("Next must not be called when rate limited");
    });

    expect(calls.statuses).toEqual([429]);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "60");
    expect((calls.bodies[0] as { error: unknown }).error).toContain("Too many requests");
  });

  it("stores counters in Redis with a TTL", async () => {
    const limiter = createRateLimiter({ scope: "redis-check", max: 5, windowMs: 30_000 });
    const req = makeRequest({ ip: "10.0.0.50" });

    await limiter(req, makeResponse().res, () => {});

    const redis = getRedisClient();
    const count = await redis.get("ratelimit:redis-check:10.0.0.50");
    const pttl = await redis.pttl("ratelimit:redis-check:10.0.0.50");

    expect(count).toBe("1");
    expect(pttl).toBeGreaterThan(0);
    expect(pttl).toBeLessThanOrEqual(30_000);
  });

  it("keys unauthenticated requests per IP", async () => {
    const limiter = createRateLimiter({ scope: "auth", max: 1, windowMs: 60_000 });

    await limiter(makeRequest({ ip: "203.0.113.1" }), makeResponse().res, () => {});
    await limiter(makeRequest({ ip: "203.0.113.2" }), makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    await limiter(makeRequest({ ip: "203.0.113.1" }), res, () => {});
    expect(calls.statuses).toEqual([429]);
  });

  it("ignores raw X-Forwarded-For headers and relies on req.ip to prevent rate-limit bypass", async () => {
    const limiter = createRateLimiter({ scope: "auth", max: 1, windowMs: 60_000 });

    const req1 = {
      headers: { "x-forwarded-for": "1.1.1.1" },
      ip: "10.0.0.1",
    } as unknown as Request;

    const req2 = {
      headers: { "x-forwarded-for": "1.1.1.2" }, // Spoofed X-Forwarded-For header
      ip: "10.0.0.1", // Same real client IP determined by Express
    } as unknown as Request;

    await limiter(req1, makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    await limiter(req2, res, () => {});
    expect(calls.statuses).toEqual([429]);
  });

  it("falls back to socket.remoteAddress or 'unknown' when req.ip is undefined", async () => {
    const limiter = createRateLimiter({ scope: "auth", max: 1, windowMs: 60_000 });

    const reqWithSocket = {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as Request;

    await limiter(reqWithSocket, makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    await limiter(reqWithSocket, res, () => {});
    expect(calls.statuses).toEqual([429]);
  });

  it("keys authenticated requests per user, not per IP", async () => {
    const limiter = createRateLimiter({ scope: "chat", max: 1, windowMs: 60_000 });

    await limiter(makeRequest({ userId: "user-1" }), makeResponse().res, () => {});

    const { res, calls } = makeResponse();
    await limiter(makeRequest({ userId: "user-1" }), res, () => {});
    expect(calls.statuses).toEqual([429]);

    const sameUserDifferentScope = makeRequest({ userId: "user-100" });
    const secondUser = makeResponse();
    await limiter(makeRequest({ userId: "user-2" }), secondUser.res, () => {
      expect(secondUser.calls.statuses).toEqual([]);
    });
  });

  it("resets after the window expires", async () => {
    const limiter = createRateLimiter({ scope: "test", max: 1, windowMs: 50 });
    const req = makeRequest({ ip: "192.0.2.9" });

    await limiter(req, makeResponse().res, () => {});

    await new Promise((resolve) => setTimeout(resolve, 60));

    const fresh = makeResponse();
    await limiter(req, fresh.res, () => {
      expect(fresh.calls.statuses).toEqual([]);
    });
  });
});
