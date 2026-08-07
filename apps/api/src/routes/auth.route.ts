import express, { Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getAuth, clerkClient } from "@clerk/express";
import { db, withRetry } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { Role } from "../generated/prisma/enums.js";

export const authRouter = express.Router();
authRouter.post(
  "/sync",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      const { userId, orgId, orgRole, orgSlug } = auth;
      if (!userId) throw new Error("No user ID found");

      let primaryEmail: string | undefined;
      let firstName: string | null = null;
      let lastName: string | null = null;
      let imageUrl: string | null = null;

      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
        firstName = clerkUser.firstName;
        lastName = clerkUser.lastName;
        imageUrl = clerkUser.imageUrl;
      } catch (err) {
        logger.warn(
          { err, userId },
          "clerkClient.users.getUser failed in sync route",
        );
      }

      const emailToUse = primaryEmail || `${userId}@user.clerk`;

      // All DB operations wrapped in withRetry for Render DB hibernation resilience
      const { user, organization } = await withRetry(async () => {
        let resolvedUser = await db.user.findUnique({
          where: { id: userId },
        });

        if (!resolvedUser) {
          const existingUserByEmail = await db.user.findUnique({
            where: { email: emailToUse },
          });

          if (existingUserByEmail) {
            resolvedUser = await db.user.update({
              where: { id: existingUserByEmail.id },
              data: {
                firstName: firstName || existingUserByEmail.firstName,
                lastName: lastName || existingUserByEmail.lastName,
                imageUrl: imageUrl || existingUserByEmail.imageUrl,
              },
            });
          } else {
            try {
              resolvedUser = await db.user.create({
                data: {
                  id: userId,
                  email: emailToUse,
                  firstName,
                  lastName,
                  imageUrl,
                },
              });
            } catch (_createErr) {
              const fallbackEmail = `${userId}-${Date.now()}@user.clerk`;
              resolvedUser = await db.user.create({
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
        } else {
          try {
            resolvedUser = await db.user.update({
              where: { id: userId },
              data: {
                email: emailToUse,
                firstName,
                lastName,
                imageUrl,
              },
            });
          } catch (_updateErr) {
            resolvedUser = await db.user.update({
              where: { id: userId },
              data: {
                firstName,
                lastName,
                imageUrl,
              },
            });
          }
        }

        // Sync organization if orgId present
        let resolvedOrg = orgId
          ? await db.organization.findUnique({
              where: { clerkOrgId: orgId },
            })
          : null;

        if (orgId && !resolvedOrg) {
          let name = orgSlug || `Org ${orgId.slice(0, 8)}`;
          let slug = orgSlug || orgId;
          let orgImageUrl: string | null = null;

          try {
            const clerkOrg = await clerkClient.organizations.getOrganization({
              organizationId: orgId,
            });
            if (clerkOrg) {
              name = clerkOrg.name || name;
              slug = clerkOrg.slug || slug;
              orgImageUrl = clerkOrg.imageUrl || null;
            }
          } catch (err) {
            logger.warn(
              { err, orgId },
              "clerkClient.organizations.getOrganization failed in sync route",
            );
          }

          const existingOrgBySlug = await db.organization.findUnique({
            where: { slug },
          });

          if (existingOrgBySlug) {
            resolvedOrg = await db.organization.update({
              where: { id: existingOrgBySlug.id },
              data: { clerkOrgId: orgId, name, imageUrl: orgImageUrl },
            });
          } else {
            try {
              resolvedOrg = await db.organization.create({
                data: {
                  clerkOrgId: orgId,
                  name,
                  slug,
                  imageUrl: orgImageUrl,
                },
              });
            } catch (_createOrgErr) {
              const fallbackSlug = `${slug}-${Date.now().toString(36)}`;
              resolvedOrg = await db.organization.create({
                data: {
                  clerkOrgId: orgId,
                  name,
                  slug: fallbackSlug,
                  imageUrl: orgImageUrl,
                },
              });
            }
          }
        }

        if (resolvedOrg) {
          const roleUpper = (orgRole || "").toUpperCase();
          let role: Role = Role.MEMBER;
          if (roleUpper.includes("OWNER") || roleUpper.includes("CREATOR")) {
            role = Role.OWNER;
          } else if (roleUpper.includes("ADMIN")) {
            role = Role.ADMIN;
          }

          await db.organizationMember.upsert({
            where: {
              userId_organizationId: {
                userId: resolvedUser.id,
                organizationId: resolvedOrg.id,
              },
            },
            update: { role },
            create: {
              userId: resolvedUser.id,
              organizationId: resolvedOrg.id,
              role,
            },
          });
        }

        return { user: resolvedUser, organization: resolvedOrg };
      });

      res.status(200).json({ success: true, user, organization });
    } catch (error) {
      logger.error({ err: error }, "Error in auth /sync");
      next(error);
    }
  },
);
