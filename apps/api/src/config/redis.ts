import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});
