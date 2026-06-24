import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "../config/database.js";
import { AppError } from "./errorHandler.js";
import { Role } from "../generated/prisma/enums.js";

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
    const { userId, orgId } = auth;
    if (!orgId) {
      return next(
        new AppError(403, "Forbidden: No active organization selected"),
      );
    }
    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });
    if (!organization) {
      return next(new AppError(403, "Forbidden: Organization not found"));
    }
    const membership = await db.organizationMember.findFirst({
      where: {
        userId: userId,
        organizationId: organization.id,
      },
    });
    if (!membership) {
      return next(
        new AppError(
          403,
          "Forbidden: User is not a member of the organization",
        ),
      );
    }

    req.tenantId = organization.id;
    req.tenantRole = membership.role;
    next();
  } catch (_error) {
    return next(
      new AppError(
        500,
        "Internal Server Error: Failed to inject tenant context",
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
