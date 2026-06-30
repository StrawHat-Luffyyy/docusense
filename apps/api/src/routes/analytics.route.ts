import express, { Request, Response, NextFunction } from "express";
import {
  requireAuth,
  injectTenantContext,
} from "../middleware/auth.middleware.js";
import { db } from "../config/database.js";

export const analyticsRouter = express.Router();

/**
 * Aggregates knowledge base metrics from existing database tables.
 * No new tables or migrations required — everything is derived from
 * Document, DocumentChunk, and TenantUsage records.
 */
analyticsRouter.get(
  "/",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;

      // Run all aggregation queries in parallel
      const [documents, chunkAgg, storageAgg, statusCounts, recentDocs, usage] =
        await Promise.all([
          // Total document count
          db.document.count({
            where: { organizationId: tenantId },
          }),

          // Total chunks across all documents
          db.documentChunk.count({
            where: { document: { organizationId: tenantId } },
          }),

          // Total storage used
          db.document.aggregate({
            where: { organizationId: tenantId },
            _sum: { sizeBytes: true, pageCount: true },
          }),

          // Documents grouped by status
          db.document.groupBy({
            by: ["status"],
            where: { organizationId: tenantId },
            _count: { _all: true },
          }),

          // Recent activity — last 10 document events
          db.document.findMany({
            where: { organizationId: tenantId },
            orderBy: { updatedAt: "desc" },
            take: 10,
            select: {
              id: true,
              filename: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              indexedAt: true,
              isPublic: true,
              sizeBytes: true,
            },
          }),

          // Usage stats
          db.tenantUsage.findUnique({
            where: { tenantId },
          }),
        ]);

      // Build status breakdown map
      const statusBreakdown: Record<string, number> = {};
      for (const group of statusCounts) {
        statusBreakdown[group.status] = group._count._all;
      }

      // Build activity feed from recent document events
      const activityFeed = recentDocs.map((doc) => {
        let action = "uploaded";
        let timestamp = doc.createdAt;

        if (doc.status === "INDEXED" && doc.indexedAt) {
          action = "indexed";
          timestamp = doc.indexedAt;
        } else if (doc.status === "PROCESSING") {
          action = "processing";
          timestamp = doc.updatedAt;
        } else if (doc.status === "FAILED") {
          action = "failed";
          timestamp = doc.updatedAt;
        }

        if (doc.isPublic) {
          action = "shared";
        }

        return {
          id: doc.id,
          filename: doc.filename,
          action,
          status: doc.status,
          timestamp,
          sizeBytes: doc.sizeBytes,
        };
      });

      res.json({
        knowledgeBase: {
          totalDocuments: documents,
          totalChunks: chunkAgg,
          totalPages: storageAgg._sum.pageCount ?? 0,
          storageUsedBytes: storageAgg._sum.sizeBytes ?? 0,
          embeddingsGenerated: chunkAgg, // 1 embedding per chunk
          statusBreakdown,
        },
        infrastructure: {
          vectorStore: "Pinecone",
          embeddingModel: "gemini-embedding-001",
          llmProvider: "Google Gemini",
          llmModel: "gemini-2.5-flash",
          chunkingStrategy: "Semantic (page-aware)",
          vectorDimensions: 768,
        },
        usage: {
          queryCount: usage?.queryCount ?? 0,
          documentCount: usage?.documentCount ?? 0,
          queryLimit: 100,
        },
        activityFeed,
      });
    } catch (error) {
      next(error);
    }
  },
);
