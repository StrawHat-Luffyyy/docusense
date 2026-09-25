import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPipelineExec = vi.fn();
const mockPipeline = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: mockPipelineExec,
};

vi.mock("../../config/redis.js", () => ({
  redis: {
    pipeline: () => mockPipeline,
  },
}));

const { rateLimit, resetMemoryFallbackStore } =
  await import("../../middleware/rateLimit.middleware.js");

describe("rateLimit middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMemoryFallbackStore();
    req = {
      tenantId: "tenant-rl-1",
      ip: "127.0.0.1",
    };
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe("standard Redis operation", () => {
    it("allows request and sets rate limit headers when under limit", async () => {
      // zcard returns 2 requests in window (limit is 5)
      mockPipelineExec.mockResolvedValue([
        [null, 0],
        [null, 2],
        [null, 1],
        [null, 1],
      ]);

      const limiter = rateLimit({ windowSec: 60, maxRequests: 5 });
      await limiter(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 5);
      expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 2); // 5 - 2 - 1
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("rejects request with 429 and Retry-After when at or over limit", async () => {
      // zcard returns 5 requests in window (limit is 5)
      mockPipelineExec.mockResolvedValue([
        [null, 0],
        [null, 5],
        [null, 1],
        [null, 1],
      ]);

      const limiter = rateLimit({ windowSec: 60, maxRequests: 5 });
      await limiter(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith("Retry-After", 30);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: "Too many requests. Please slow down.",
        retryAfter: 30,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Redis failure & fallback behavior", () => {
    it("activates in-memory fallback when Redis fails, allowing under-limit requests", async () => {
      mockPipelineExec.mockRejectedValue(new Error("Redis connection refused"));

      const limiter = rateLimit({ windowSec: 60, maxRequests: 3 });
      await limiter(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("in-memory fallback enforces rate limit when exceeded during Redis failure", async () => {
      mockPipelineExec.mockRejectedValue(new Error("Redis connection lost"));

      const limiter = rateLimit({ windowSec: 60, maxRequests: 2 });

      // Request 1: allowed
      await limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Request 2: allowed
      await limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Request 3: exceeded -> 429
      await limiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Too many requests. Please slow down.",
        }),
      );
      expect(next).toHaveBeenCalledTimes(2); // not incremented
    });

    it("strictly fails closed (503) if failClosed option is true", async () => {
      mockPipelineExec.mockRejectedValue(new Error("Redis connection refused"));

      const limiter = rateLimit({
        windowSec: 60,
        maxRequests: 10,
        failClosed: true,
      });
      await limiter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: "Service temporarily unavailable. Rate limiter offline.",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
