import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const prismaClientSingleton = () => {
  const connectionString = env.DATABASE_URL;
  const isProduction =
    env.NODE_ENV === "production" || Boolean(process.env.RENDER);

  const pool = new pg.Pool({
    connectionString,
    // Connection pool sizing
    max: 10,
    min: 0,
    // Timeout configs for Render hibernation resilience
    connectionTimeoutMillis: 30_000, // 30s to establish a new connection (DB may be waking up)
    idleTimeoutMillis: 30_000, // close idle connections after 30s
    // Allow stale connections to be replaced
    allowExitOnIdle: true,
    ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  // Log pool errors instead of crashing the process
  pool.on("error", (err) => {
    logger.error(
      { err },
      "Unexpected pg.Pool error (connection will be retried)",
    );
  });

  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== "production") globalThis.prismaGlobal = db;

/**
 * Retry wrapper for Prisma operations that may fail due to
 * transient ECONNREFUSED errors (e.g. Render DB waking from hibernation).
 *
 * Usage:
 *   const user = await withRetry(() => db.user.findUnique({ where: { id } }));
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error?.code === "ECONNREFUSED" ||
        error?.code === "ECONNRESET" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "EPIPE" ||
        error?.message?.includes("ECONNREFUSED") ||
        error?.message?.includes("Connection terminated") ||
        error?.message?.includes("connection to server");

      if (isRetryable && attempt < maxRetries) {
        const backoff = delayMs * attempt;
        logger.warn(
          { attempt, maxRetries, code: error?.code, backoff },
          `DB operation failed with retryable error, retrying in ${backoff}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}
