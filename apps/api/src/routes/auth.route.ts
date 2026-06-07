import express, { Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "../config/database.js";

export const authRouter = express.Router();
authRouter.post(
  "sync",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) throw new Error("No user ID found");

      // Fetch latest user data directly from Clerk's API
      const clerkUser = await clerkClient.users.getUser(userId);
      const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;

      // Idempotent upsert
      const user = await db.user.upsert({
        where: { id: userId },
        update: {
          email: primaryEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
        create: {
          id: userId,
          email: primaryEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
      });

      res.status(200).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  },
);
