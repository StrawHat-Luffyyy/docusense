import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

interface RateLimitOptions {
  /** Time window in seconds */
  windowSec: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Key prefix for Redis */
  prefix?: string;
}

/**
 * Redis-based sliding window rate limiter middleware.
 *
 * Uses a sorted set per key with timestamps as scores. On each request:
 * 1. Remove entries older than the window
 * 2. Count remaining entries
 * 3. If under limit, add current timestamp and allow
 * 4. If over limit, reject with 429 + Retry-After header
 *
 * Key strategy: per-tenant for authenticated routes (uses req.tenantId).
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowSec, maxRequests, prefix = "rl" } = options;

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
      // If Redis is down, fail open (allow the request)
      logger.error({ err: error }, "Rate limit Redis error — failing open");
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
