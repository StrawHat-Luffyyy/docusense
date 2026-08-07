import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "../config/database.js";
import { AppError } from "./errorHandler.js";
import { Role } from "../generated/prisma/enums.js";
import { logger } from "../utils/logger.js";

function mapClerkRoleToRole(clerkRole?: string | null): Role {
  if (!clerkRole) return Role.MEMBER;
  const roleUpper = clerkRole.toUpperCase();
  if (roleUpper.includes("OWNER") || roleUpper.includes("CREATOR")) {
    return Role.OWNER;
  }
  if (roleUpper.includes("ADMIN")) {
    return Role.ADMIN;
  }
  return Role.MEMBER;
}

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

    // 1. Ensure User exists in DB (JIT sync)
    let user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      let email: string | undefined;
      let firstName: string | null = null;
      let lastName: string | null = null;
      let imageUrl: string | null = null;

      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        email = clerkUser.emailAddresses[0]?.emailAddress;
        firstName = clerkUser.firstName;
        lastName = clerkUser.lastName;
        imageUrl = clerkUser.imageUrl;
      } catch (err) {
        logger.warn(
          { err, userId },
          "Failed to fetch user from Clerk API, using fallback",
        );
      }

      const emailToUse = email || `${userId}@user.clerk`;

      // Check if user exists by email if not by ID
      const existingUserByEmail = await db.user.findUnique({
        where: { email: emailToUse },
      });

      if (existingUserByEmail) {
        user = existingUserByEmail;
      } else {
        try {
          user = await db.user.create({
            data: {
              id: userId,
              email: emailToUse,
              firstName,
              lastName,
              imageUrl,
            },
          });
        } catch (_createErr) {
          // Fallback with timestamped unique email if collision occurs
          const fallbackEmail = `${userId}-${Date.now()}@user.clerk`;
          user = await db.user.create({
            data: {
              id: userId,
              email: fallbackEmail,
              firstName,
              lastName,
              imageUrl,
            },
          });
        }
      }
    }

    // 2. Ensure Organization exists in DB (JIT sync)
    let organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      let name = orgSlug || `Org ${orgId.slice(0, 8)}`;
      let slug = orgSlug || orgId;
      let imageUrl: string | null = null;

      try {
        const clerkOrg = await clerkClient.organizations.getOrganization({
          organizationId: orgId,
        });
        if (clerkOrg) {
          name = clerkOrg.name || name;
          slug = clerkOrg.slug || slug;
          imageUrl = clerkOrg.imageUrl || null;
        }
      } catch (err) {
        logger.warn(
          { err, orgId },
          "Failed to fetch org from Clerk API, using fallback",
        );
      }

      // Check if organization exists by slug
      const existingOrgBySlug = await db.organization.findUnique({
        where: { slug },
      });

      if (existingOrgBySlug) {
        organization = await db.organization.update({
          where: { id: existingOrgBySlug.id },
          data: { clerkOrgId: orgId, name, imageUrl },
        });
      } else {
        try {
          organization = await db.organization.create({
            data: {
              clerkOrgId: orgId,
              name,
              slug,
              imageUrl,
            },
          });
        } catch (_createOrgErr) {
          // Fallback with unique slug if slug collision occurs
          const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
          organization = await db.organization.create({
            data: {
              clerkOrgId: orgId,
              name,
              slug: fallbackSlug,
              imageUrl,
            },
          });
        }
      }
    }

    // 3. Ensure OrganizationMember exists in DB (JIT sync)
    let membership = await db.organizationMember.findFirst({
      where: {
        userId: userId,
        organizationId: organization.id,
      },
    });

    if (!membership) {
      const mappedRole = mapClerkRoleToRole(orgRole);

      membership = await db.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: userId,
            organizationId: organization.id,
          },
        },
        update: { role: mappedRole },
        create: {
          userId: userId,
          organizationId: organization.id,
          role: mappedRole,
        },
      });
    }

    req.tenantId = organization.id;
    req.tenantRole = membership.role;
    next();
  } catch (error) {
    const errMessage = (error as Error)?.message || "Unknown error";
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
