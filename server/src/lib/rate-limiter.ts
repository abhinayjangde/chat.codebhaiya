import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

interface WindowEntry {
  count: number;
  expiresAt: number;
}

const windows = new Map<string, WindowEntry>();

// Periodically evict expired entries so the map does not grow unbounded.
let sweeper: ReturnType<typeof setInterval> | undefined;

function ensureSweeper(): void {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (entry.expiresAt <= now) {
        windows.delete(key);
      }
    }
  }, 60_000);
  sweeper.unref();
}

/** Reset all recorded requests. Exposed for tests. */
export function resetRateLimits(): void {
  windows.clear();
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.ip ?? "unknown";
}

function buildKey(scope: string, req: Request): string {
  // Authenticated requests are limited per account; unauthenticated (login)
  // attempts are limited per client IP.
  const identity = req.user?.userId ?? clientIp(req);
  return `${scope}:${identity}`;
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
) => void;

/**
 * Fixed-window rate limiter, keyed per scope and by authenticated user ID
 * (falling back to client IP when the request is not authenticated). Adds
 * standard RateLimit headers and responds with 429 + Retry-After on excess.
 */
export function createRateLimiter({
  scope,
  max,
  windowMs = env.RATE_LIMIT_WINDOW_MS,
}: RateLimitOptions): RateLimiter {
  ensureSweeper();

  return (req, res, next) => {
    if (!env.RATE_LIMITING_ENABLED) {
      next();
      return;
    }

    const key = buildKey(scope, req);
    const now = Date.now();
    let entry = windows.get(key);
    if (!entry || entry.expiresAt <= now) {
      entry = { count: 0, expiresAt: now + windowMs };
      windows.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.expiresAt - now) / 1000);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(429).json({
        success: false,
        error: "Too many requests. Please slow down and try again shortly.",
      });
      return;
    }

    next();
  };
}
