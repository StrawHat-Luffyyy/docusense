import express, { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  injectTenantContext,
} from "../middleware/auth.middleware.js";
import { s3Service } from "../services/s3.service.js";
import { db } from "../config/database.js";
import { randomUUID } from "crypto";

export const documentsRouter = express.Router();

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "text/plain",
  "text/markdown",
];
documentsRouter.post(
  "/upload/init",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename, contentType, sizeBytes } = req.body;
      const tenantId = req.tenantId;
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        return res.status(400).json({ error: "File type not supported" });
      }
      if (sizeBytes > 50 * 1024 * 1024) {
        return res.status(400).json({ error: "File exceeds 50MB limit" });
      }
      const documentId = randomUUID();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storageKey = `${tenantId}/documents/${documentId}/${sanitizedFilename}`;
      const uploadUrl = await s3Service.createPresignedPutUrl(
        storageKey,
        contentType,
      );
      //TODO: Create a pending document record in the database with status 'uploading'
      res.status(200).json({
        documentId,
        uploadUrl,
        storageKey,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);
