import express, { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  injectTenantContext,
} from "../middleware/auth.middleware.js";
import { s3Service } from "../services/s3.service.js";
import { db } from "../config/database.js";
import { randomUUID } from "crypto";
import { enqueueDocumentProcessing } from "../queues/ingestion.queue.js";

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
      const tenantId = req.tenantId!;
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
      const document = await db.document.create({
        data: {
          id: documentId,
          filename: sanitizedFilename,
          mimeType: contentType,
          sizeBytes,
          storageKey,
          status: "PENDING",
          organizationId: tenantId,
        },
      });
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

documentsRouter.post(
  "/:id/process",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      const tenantId = req.tenantId!;

      const document = await db.document.findUnique({
        where: { id },
      });
      if (!document || document.organizationId !== tenantId) {
        return res.status(404).json({ error: "Document not found" });
      }
      if (document.status !== "PENDING" && document.status !== "FAILED") {
        return res
          .status(400)
          .json({ error: "Document is already processing or indexed" });
      }
      // Verify the file actually exists in S3 here
      const existsInS3 = await s3Service.checkObjectExists(document.storageKey);
      if (!existsInS3) {
        return res.status(400).json({ error: "File not found in storage" });
      }
      await db.document.update({
        where: { id },
        data: { status: "PROCESSING" },
      });
      await enqueueDocumentProcessing({
        documentId: document.id,
        tenantId: document.organizationId,
        storageKey: document.storageKey,
      });
      res.status(202).json({
        status: "queued",
        message: "Document ingestion started in the background.",
      });
    } catch (error) {
      next(error);
    }
  },
);
