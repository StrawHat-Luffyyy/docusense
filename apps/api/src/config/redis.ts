import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export function getRedisConnectionOptions() {
  const url = new URL(env.REDIS_URL);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,

    // BullMQ requirements
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,

  // This should match BullMQ expectations
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});
