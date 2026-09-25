import express, { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  injectTenantContext,
} from "../middleware/auth.middleware.js";
import { s3Service } from "../services/s3.service.js";
import { pineconeService } from "../services/pinecone.service.js";
import { db } from "../config/database.js";
import { randomUUID } from "crypto";
import { enqueueDocumentProcessing } from "../queues/ingestion.queue.js";
import crypto from "crypto";
import { rateLimiters } from "../middleware/rateLimit.middleware.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

export const documentsRouter = express.Router();

const ALLOWED_MIME_TYPES = ["application/pdf"];
documentsRouter.post(
  "/upload/init",
  requireAuth,
  injectTenantContext,
  rateLimiters.upload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename, contentType, sizeBytes } = req.body || {};
      if (!filename || typeof filename !== "string") {
        return res.status(400).json({ error: "Filename is required" });
      }
      if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
        return res.status(400).json({
          error: "File type not supported. Only PDF files are allowed.",
        });
      }
      if (!sizeBytes || typeof sizeBytes !== "number" || sizeBytes <= 0) {
        return res
          .status(400)
          .json({ error: "Valid file sizeBytes is required" });
      }
      if (sizeBytes > 50 * 1024 * 1024) {
        return res.status(400).json({ error: "File exceeds 50MB limit" });
      }

      const tenantId = req.tenantId!;
      const documentId = randomUUID();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storageKey = `${tenantId}/documents/${documentId}/${sanitizedFilename}`;

      let uploadUrl: string;
      try {
        uploadUrl = await s3Service.createPresignedPutUrl(
          storageKey,
          contentType,
        );
      } catch (s3Error: any) {
        return next(
          new AppError(
            500,
            `Storage configuration error: ${s3Error?.message || "Failed to create upload URL"}`,
          ),
        );
      }

      await db.$transaction([
        db.document.create({
          data: {
            id: documentId,
            filename: sanitizedFilename,
            mimeType: contentType,
            sizeBytes,
            storageKey,
            status: "PENDING",
            organizationId: tenantId,
          },
        }),

        db.tenantUsage.upsert({
          where: { tenantId },
          update: {
            documentCount: { increment: 1 },
          },
          create: {
            tenantId,
            documentCount: 1,
            queryCount: 0,
          },
        }),
      ]);

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

/**
 * Toggle document sharing and generate/revoke access tokens
 */
documentsRouter.patch(
  "/:id/share",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      const { isPublic } = req.body;
      const tenantId = req.tenantId!;

      const document = await db.document.findUnique({
        where: { id },
      });
      if (!document || document.organizationId !== tenantId) {
        return res.status(404).json({ error: "Document not found" });
      }

      let sharingToken = document.sharingToken;
      let sharedAt = document.sharedAt;
      if (isPublic) {
        if (!sharingToken) {
          sharingToken = crypto.randomBytes(32).toString("hex");
          sharedAt = new Date();
        }
      } else {
        // Wipe them out if the user revokes public access
        sharingToken = null;
        sharedAt = null;
      }
      const updatedDoc = await db.document.update({
        where: { id },
        data: {
          isPublic,
          sharingToken,
          sharedAt,
        },
        select: {
          id: true,
          isPublic: true,
          sharingToken: true,
        },
      });
      res.json({
        message: isPublic ? "Public link generated" : "Public access revoked",
        document: updatedDoc,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * Fetch all documents for the authenticated tenant
 */
documentsRouter.get(
  "/",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;

      const documents = await db.document.findMany({
        where: { organizationId: tenantId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          filename: true,
          status: true,
          isPublic: true,
          sharingToken: true,
          pageCount: true,
          wordCount: true,
          chunkCount: true,
          sizeBytes: true,
          mimeType: true,
          indexedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ documents });
    } catch (error) {
      next(error);
    }
  },
);
/**
 * Delete a document, its S3 object, Pinecone vectors, and decrement tenant usage.
 *
 * Ordering:
 *   1. Fetch chunk IDs from DB (needed to identify Pinecone vectors)
 *   2. Delete vectors from Pinecone (mandatory — failure aborts the operation)
 *   3. Delete S3 object (best-effort — orphaned files are acceptable)
 *   4. Delete DB rows in a transaction (cascades to DocumentChunk)
 *
 * Pinecone deletion is NOT best-effort: leaving orphaned vectors would cause
 * stale results in future searches. The operation is safe to retry since
 * Pinecone deletes are idempotent.
 */
documentsRouter.delete(
  "/:id",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }
      const tenantId = req.tenantId!;

      const document = await db.document.findUnique({ where: { id } });
      if (!document || document.organizationId !== tenantId) {
        return res.status(404).json({ error: "Document not found" });
      }

      // 1. Fetch chunk IDs before DB deletion (cascading delete erases them)
      const chunks = await db.documentChunk.findMany({
        where: { documentId: id },
        select: { id: true },
      });
      const chunkIds = chunks.map((c) => c.id);

      // 2. Delete vectors from Pinecone (mandatory — abort on failure)
      if (chunkIds.length > 0) {
        await pineconeService.deleteDocumentVectors(tenantId, id, chunkIds);
      }

      // 3. Best-effort S3 cleanup — don't block DB deletion if this fails
      try {
        await s3Service.deleteObject(document.storageKey);
      } catch (s3Error) {
        logger.error(
          { err: s3Error, documentId: id, storageKey: document.storageKey },
          "Failed to delete S3 object — continuing with DB deletion",
        );
      }

      // 4. Delete DB rows (cascades to DocumentChunk) + decrement usage
      await db.$transaction([
        db.document.delete({ where: { id } }), // cascades to DocumentChunk
        db.tenantUsage.update({
          where: { tenantId },
          data: { documentCount: { decrement: 1 } },
        }),
      ]);

      res.status(200).json({ message: "Document deleted" });
    } catch (error) {
      next(error);
    }
  },
);
