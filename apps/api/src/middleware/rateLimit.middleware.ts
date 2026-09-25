import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

export interface RateLimitOptions {
  /** Time window in seconds */
  windowSec: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Key prefix for Redis */
  prefix?: string;
  /** If true, strictly reject requests (503) when Redis fails instead of using in-memory fallback */
  failClosed?: boolean;
}

// In-memory fallback sliding window store for Redis outages
const memoryFallbackStore = new Map<string, number[]>();

export function resetMemoryFallbackStore() {
  memoryFallbackStore.clear();
}

// Prune stale in-memory entries periodically (unref'd to prevent keeping Node process alive)
const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of memoryFallbackStore.entries()) {
    const valid = timestamps.filter((t) => now - t < 300_000);
    if (valid.length === 0) {
      memoryFallbackStore.delete(key);
    } else {
      memoryFallbackStore.set(key, valid);
    }
  }
}, 300_000);
pruneTimer.unref();

/**
 * Redis-based sliding window rate limiter middleware with in-memory resilience.
 *
 * Uses a sorted set per key with timestamps as scores. On each request:
 * 1. Remove entries older than the window
 * 2. Count remaining entries
 * 3. If under limit, add current timestamp and allow
 * 4. If over limit, reject with 429 + Retry-After header
 *
 * Resilience:
 * If Redis is unavailable, requests are protected by an in-memory sliding window
 * fallback rather than completely failing open to unlimited traffic.
 *
 * Key strategy: per-tenant for authenticated routes (uses req.tenantId).
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowSec, maxRequests, prefix = "rl", failClosed = false } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Use tenantId for authenticated routes, fall back to IP
    const identifier = req.tenantId || req.ip || "anonymous";
    const key = `${prefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSec * 1000;

    try {
      // Pipeline for atomicity
      const pipeline = redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current entries
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}:${Math.random()}`);

      // Set TTL to auto-cleanup
      pipeline.expire(key, windowSec);

      const results = await pipeline.exec();

      // zcard result is at index 1
      const currentCount = (results?.[1]?.[1] as number) || 0;

      // Set rate limit headers
      const remaining = Math.max(0, maxRequests - currentCount - 1);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((now + windowSec * 1000) / 1000),
      );

      if (currentCount >= maxRequests) {
        const retryAfter = Math.ceil(windowSec / 2);
        res.setHeader("Retry-After", retryAfter);

        logger.warn({ key, currentCount, maxRequests }, "Rate limit exceeded");

        res.status(429).json({
          error: "Too many requests. Please slow down.",
          retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error(
        { err: error, key, failClosed },
        "Rate limit Redis error — activating fallback protection",
      );

      if (failClosed) {
        return res.status(503).json({
          error: "Service temporarily unavailable. Rate limiter offline.",
        });
      }

      // In-memory sliding window fallback prevents unlimited abuse during Redis outages
      const nowTs = Date.now();
      const windowStartTs = nowTs - windowSec * 1000;
      const history = (memoryFallbackStore.get(key) || []).filter(
        (t) => t > windowStartTs,
      );

      if (history.length >= maxRequests) {
        const retryAfter = Math.ceil(windowSec / 2);
        res.setHeader("Retry-After", retryAfter);
        return res.status(429).json({
          error: "Too many requests. Please slow down.",
          retryAfter,
        });
      }

      history.push(nowTs);
      memoryFallbackStore.set(key, history);
      next();
    }
  };
}

/**
 * Pre-configured rate limiters for common use cases.
 */
export const rateLimiters = {
  /** Chat: 30 requests per minute per tenant */
  chat: rateLimit({
    windowSec: 60,
    maxRequests: 30,
    prefix: "rl:chat",
  }),

  /** Upload: 10 uploads per minute per tenant */
  upload: rateLimit({
    windowSec: 60,
    maxRequests: 10,
    prefix: "rl:upload",
  }),

  /** General API: 100 requests per minute */
  general: rateLimit({
    windowSec: 60,
    maxRequests: 100,
    prefix: "rl:general",
  }),
};
