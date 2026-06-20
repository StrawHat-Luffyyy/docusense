import express, { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  injectTenantContext,
} from "../middleware/auth.middleware.js";
import { usageService } from "../services/usage.service.js";

export const usageRouter = express.Router();

usageRouter.get(
  "/",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const usage = await usageService.getTenantUsage(tenantId);
      res.json({
        usage: usage || { documentCount: 0, queryCount: 0 },
        limit: 100,
      });
    } catch (error) {
      next(error);
    }
  },
);
