import express, { Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getAuth, clerkClient } from "@clerk/express";
import { logger } from "../utils/logger.js";
import {
  tenantSyncService,
  ClerkUserProfile,
} from "../services/tenant-sync.service.js";

export const authRouter = express.Router();
authRouter.post(
  "/sync",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      const { userId, orgId, orgRole, orgSlug } = auth;
      if (!userId) throw new Error("No user ID found");

      let clerkProfile: ClerkUserProfile | undefined;

      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        clerkProfile = {
          email: clerkUser.emailAddresses[0]?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        };
      } catch (err) {
        logger.warn(
          { err, userId },
          "clerkClient.users.getUser failed in sync route",
        );
      }

      const user = await tenantSyncService.syncUser(userId, {
        profile: clerkProfile,
        updateIfExists: true,
      });

      let organization = null;
      if (orgId) {
        organization = await tenantSyncService.syncOrganization(orgId, orgSlug);
        await tenantSyncService.syncMembership(
          user.id,
          organization.id,
          orgRole,
        );
      }

      res.status(200).json({ success: true, user, organization });
    } catch (error) {
      logger.error({ err: error }, "Error in auth /sync");
      next(error);
    }
  },
);
