import express, { Request, Response } from "express";
import { Webhook } from "svix";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { db } from "../config/database.js";
import { Role } from "../generated/prisma/enums.js";

export const webhookRouter = express.Router();

webhookRouter.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const SIGNING_SECRET = env.CLERK_WEBHOOK_SECRET;
    if (!SIGNING_SECRET) {
      logger.error("Missing CLERK_WEBHOOK_SECRET");
      return res.status(500).json({ error: "Server configuration error" });
    }
    const svix_id = req.headers["svix-id"] as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }
    const payload = req.body;
    const body = payload.toString("utf-8");
    const wh = new Webhook(SIGNING_SECRET);

    let evt: any;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      logger.error({ err }, "Webhook signature verification failed");
      return res.status(400).json({ error: "Invalid signature" });
    }
    const eventType = evt.type;
    logger.info({ eventType }, "Received Clerk Webhook");

    try {
      if (eventType === "user.created" || eventType === "user.updated") {
        const { id, email_addresses, first_name, last_name, image_url } =
          evt.data;
        const primaryEmail = email_addresses[0]?.email_address;

        await db.user.upsert({
          where: { id },
          update: {
            email: primaryEmail,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
          create: {
            id,
            email: primaryEmail,
            firstName: first_name,
            lastName: last_name,
            imageUrl: image_url,
          },
        });

        if (
          eventType == "organization.created" ||
          eventType === "organization.updated"
        ) {
          const { id, name, slug, image_url, created_by } = evt.data;
          await db.organization.upsert({
            where: { clerkOrgId: id },
            update: { name, slug, imageUrl: image_url },
            create: {
              clerkOrgId: id,
              name,
              slug,
              imageUrl: image_url,
            },
          });
          // If created_by is present, they are the OWNER
          if (eventType === "organization.created" && created_by) {
            const internalOrg = await db.organization.findUnique({
              where: { clerkOrgId: id },
            });
            if (internalOrg) {
              await db.organizationMember.upsert({
                where: {
                  userId_organizationId: {
                    userId: created_by,
                    organizationId: internalOrg.id,
                  },
                },
                update: { role: Role.OWNER },
                create: {
                  userId: created_by,
                  organizationId: internalOrg.id,
                  role: Role.OWNER,
                },
              });
            }
          }
        }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error({ err: error, eventType }, "Error processing webhook data");
      return res.status(500).json({ error: "Database operation failed" });
    }
  },
);
