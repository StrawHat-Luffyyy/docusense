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

export interface WithRetryOptions {
  context?: string;
  maxRetries?: number;
  delayMs?: number;
}

/**
 * Retry wrapper for Prisma operations that may fail due to
 * transient ECONNREFUSED or database hibernation errors.
 *
 * Usage:
 *   const user = await withRetry(() => db.user.findUnique({ where: { id } }), "user.findUnique");
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  optsOrContextOrMaxRetries: WithRetryOptions | string | number = 4,
  delayMs = 1000,
  contextParam?: string,
): Promise<T> {
  let maxRetries = 4;
  let delay = delayMs;
  let context: string | undefined = contextParam;

  if (typeof optsOrContextOrMaxRetries === "string") {
    context = optsOrContextOrMaxRetries;
  } else if (typeof optsOrContextOrMaxRetries === "number") {
    maxRetries = optsOrContextOrMaxRetries;
  } else if (
    typeof optsOrContextOrMaxRetries === "object" &&
    optsOrContextOrMaxRetries !== null
  ) {
    context = optsOrContextOrMaxRetries.context;
    maxRetries = optsOrContextOrMaxRetries.maxRetries ?? 4;
    delay = optsOrContextOrMaxRetries.delayMs ?? 1000;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const code = error?.code;
      const message = error?.message || "";
      const isRetryable =
        code === "ECONNREFUSED" ||
        code === "ECONNRESET" ||
        code === "ETIMEDOUT" ||
        code === "EPIPE" ||
        code === "57P01" ||
        code === "P1001" || // Can't reach database server
        code === "P1002" || // Database server reached but timed out
        code === "P1003" || // Database file does not exist
        code === "P1008" || // Operations timed out
        code === "P1017" || // Server has closed the connection
        message.includes("ECONNREFUSED") ||
        message.includes("ECONNRESET") ||
        message.includes("Connection terminated") ||
        message.includes("connection to server") ||
        message.includes("Can't reach database server") ||
        message.includes("PrismaClientInitializationError");

      if (isRetryable && attempt < maxRetries) {
        const backoff = delay * Math.pow(2, attempt - 1);
        logger.warn(
          {
            context: context || "unspecified",
            attempt,
            maxRetries,
            code,
            backoff,
            errorMessage: message,
          },
          `[DB RETRY] Operation ${context ? `'${context}' ` : ""}failed with retryable error (${code || "NO_CODE"}), retrying in ${backoff}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      } else {
        logger.error(
          {
            context: context || "unspecified",
            attempt,
            maxRetries,
            isRetryable,
            code,
            err: error,
          },
          `[DB FAILURE] Operation ${context ? `'${context}' ` : ""}failed permanently after ${attempt} attempt(s)`,
        );
        throw error;
      }
    }
  }
  throw lastError;
}
