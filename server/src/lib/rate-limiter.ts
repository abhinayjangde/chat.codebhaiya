import type { NextFunction, Request, Response } from "express";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    redisClient.on("error", (err) => {
      console.error("Rate limiter Redis client error:", err);
    });
  }
  return redisClient;
}

export function setRedisClient(client: Redis | null): void {
  redisClient = client;
}

/** Close the Redis connection used by the rate limiter. */
export async function closeRateLimiter(): Promise<void> {
  if (redisClient) {
    await redisClient.quit().catch(() => redisClient?.disconnect());
    redisClient = null;
  }
}

/** Reset all recorded requests in Redis. Exposed for tests. */
export async function resetRateLimits(): Promise<void> {
  try {
    const client = getRedisClient();
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        "MATCH",
        "ratelimit:*",
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("Failed to reset rate limits:", error);
  }
}

function clientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function buildKey(scope: string, req: Request): string {
  // Authenticated requests are limited per account; unauthenticated (login)
  // attempts are limited per client IP.
  const identity = req.user?.userId ?? clientIp(req);
  return `ratelimit:${scope}:${identity}`;
}

interface RateLimitOptions {
  scope: string;
  max: number;
  windowMs?: number;
}

export type RateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Atomic Lua script to increment the request counter and manage TTL.
 * Sets the expiration window on the first request and returns the
 * current count and remaining TTL in milliseconds.
 */
const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

/**
 * Fixed-window rate limiter backed by Redis.
 * Keyed per scope and by authenticated user ID (falling back to client IP
 * when the request is not authenticated).
 *
 * Hit counters and TTL expiration are handled natively by Redis, preventing
 * unbounded in-memory accumulation in Node.js heap.
 *
 * Adds standard RateLimit headers and responds with 429 + Retry-After on excess.
 */
export function createRateLimiter({
  scope,
  max,
  windowMs = env.RATE_LIMIT_WINDOW_MS,
}: RateLimitOptions): RateLimiter {
  return async (req, res, next) => {
    if (!env.RATE_LIMITING_ENABLED) {
      next();
      return;
    }

    const key = buildKey(scope, req);

    try {
      const client = getRedisClient();
      const [count, ttl] = (await client.eval(
        RATE_LIMIT_LUA,
        1,
        key,
        String(windowMs)
      )) as [number, number];

      const remaining = Math.max(0, max - count);
      const resetSeconds = Math.max(1, Math.ceil(ttl / 1000));

      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (count > max) {
        res.setHeader("Retry-After", String(resetSeconds));
        res.status(429).json({
          success: false,
          error: "Too many requests. Please slow down and try again shortly.",
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Rate limiter Redis error:", error);
      // Fail open so Redis issues do not degrade core API availability
      next();
    }
  };
}
