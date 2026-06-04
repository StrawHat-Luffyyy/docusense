import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { randomUUID } from "crypto";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler, AppError } from "./middleware/errorHandler.js";

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

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    timestamp: new Date().toISOString(),
    service: "@docusense/api",
  });
});

// Test route to verify the error handler
app.get("/api/test-error", () => {
  throw new AppError(400, "This is a test validation error");
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API Server running on http://localhost:${env.PORT}`);
});
