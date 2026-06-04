import "dotenv/config";
import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { randomUUID } from "crypto";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler, AppError } from "./middleware/errorHandler.js";
import { db } from "./config/database.js";
import { redis } from "./config/redis.js";

const app = express();

app.use((req, res, next) => {
  ((req.headers["x-correlation-id"] =
    req.headers["x-correlation-id"] || randomUUID()),
    res.setHeader("X-Correlation-ID", req.headers["x-correlation-id"]));
  next();
});

//Global Security & Utility Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.ALLOW_ORIGINS.split(","),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  pinoHttp({
    logger,
    genReqId: (req: { headers: { [x: string]: any } }) =>
      req.headers["x-correlation-id"],
  }),
);

app.get("/api/health", async (req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.ping();
    res.status(200).json({
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      db: "ok",
      redis: "ok",
    });
  } catch (error) {
    logger.error({ err: error }, "Health Check Failed");
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      db: "error",
      redis: "error",
    });
  }
});
// Test route to verify the error handler
app.get("/api/test-error", () => {
  throw new AppError(400, "This is a test validation error");
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API Server running on http://localhost:${env.PORT}`);
});
