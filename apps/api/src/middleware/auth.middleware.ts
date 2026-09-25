import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { AppError } from "./errorHandler.js";
import { Role } from "../generated/prisma/enums.js";
import { logger } from "../utils/logger.js";
import {
  tenantSyncService,
  mapClerkRoleToRole,
} from "../services/tenant-sync.service.js";

export { mapClerkRoleToRole };

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    return next(new AppError(401, "Unauthorized: Please sign in"));
  }
  next();
};

export const injectTenantContext = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const auth = getAuth(req);
    const { userId, orgId, orgRole, orgSlug } = auth;

    if (!userId) {
      return next(new AppError(401, "Unauthorized: Please sign in"));
    }

    if (!orgId) {
      return next(
        new AppError(403, "Forbidden: No active organization selected"),
      );
    }

    const { organization, membership } =
      await tenantSyncService.syncTenantContext({
        userId,
        orgId,
        orgRole,
        orgSlug,
      });

    if (!organization || !membership) {
      return next(
        new AppError(
          500,
          "Failed to resolve organization or membership context",
        ),
      );
    }

    req.tenantId = organization.id;
    req.tenantRole = membership.role;
    next();
  } catch (error) {
    const code = (error as any)?.code;
    const errMessage = (error as Error)?.message || "Unknown error";
    const isDbUnreachable =
      code === "ECONNREFUSED" ||
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "57P01" ||
      code === "P1001" ||
      code === "P1002" ||
      code === "P1017" ||
      errMessage.includes("ECONNREFUSED") ||
      errMessage.includes("Can't reach database server") ||
      errMessage.includes("Connection terminated") ||
      errMessage.includes("connection to server");

    if (isDbUnreachable) {
      logger.error(
        { err: error, code, isDbConnectionError: true },
        "[DB UNREACHABLE] Database connection failed during tenant context injection. Check DATABASE_URL and Postgres status.",
      );
      return next(
        new AppError(
          500,
          `Database Connection Error: Unable to reach database server (${errMessage})`,
        ),
      );
    }

    logger.error(
      { err: error, errorMessage: errMessage },
      "Failed to inject tenant context",
    );
    return next(
      new AppError(
        500,
        `Internal Server Error: Failed to inject tenant context (${errMessage})`,
      ),
    );
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantRole || !allowedRoles.includes(req.tenantRole)) {
      return next(new AppError(403, "Forbidden: Insufficient permissions"));
    }
    next();
  };
};
