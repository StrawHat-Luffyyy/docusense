import express, { Request, Response, NextFunction } from "express";
import { db } from "../config/database.js";

export const publicRouter = express.Router();

/**
 * Fetch a publicly shared document via its token
 */
publicRouter.get(
  "/documents/:token",
  async (req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", "no-store");
    try {
      const { token } = req.params;
      if (!token || Array.isArray(token)) {
        return res.status(400).json({ error: "Invalid token" });
      }
      const document = await db.document.findUnique({
        where: { sharingToken: token },
        select: {
          filename: true,
          status: true,
          pageCount: true,
          chunkCount: true,
          sharedAt: true,
        },
      });
      if (!document || !document.sharedAt) {
        return res
          .status(404)
          .json({ error: "Shared document not found or link expired" });
      }
      res.json({ document });
    } catch (error) {
      next(error);
    }
  },
);
