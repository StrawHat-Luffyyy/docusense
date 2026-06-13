import { Worker, Job } from "bullmq";
import { redis } from "../config/redis.js";
import { db } from "../config/database.js";
import { s3Service } from "../services/s3.service.js";
import { logger } from "../utils/logger.js";
import { INGESTION_QUEUE_NAME } from "../queues/ingestion.queue.js";
import { chunkingService } from "../services/chunking.service.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

logger.info("👷 Starting Ingestion Worker Process...");

const worker = new Worker(
  INGESTION_QUEUE_NAME,
  async (job: Job) => {
    const { documentId, tenantId, storageKey } = job.data;
    logger.info({ documentId, tenantId }, "Job Started: Processing Document");
    try {
      logger.debug("Downloading file from S3...");
      const fileBuffer = await s3Service.getObjectBuffer(storageKey);
      logger.debug("Extracting text from PDF...");
      const pdfData = await pdfParse(fileBuffer);
      const rawText = pdfData.text;

      logger.info(`Extracted ${pdfData.numpages} pages from document`);

      logger.debug("Chunking text...");
      const chunks = await chunkingService.splitText(rawText);
      logger.info(`Generated ${chunks.length} chunks from document`);

      logger.debug("Saving chunks to database...");

      const chunkData = chunks.map((content, index) => ({
        documentId: documentId,
        content: content,
        chunkIndex: index,
      }));
      await db.documentChunk.createMany({
        data: chunkData,
      });

      await db.document.update({
        where: { id: documentId },
        data: {
          pageCount: pdfData.numpages,
          chunkCount: chunks.length,
        },
      });
      logger.info(
        { documentId },
        " Job Step Complete: Text Extracted and Chunked",
      );
    } catch (error: any) {
      logger.error({ err: error, documentId }, "Job Failed");
      await db.document.update({
        where: {
          id: documentId,
        },
        data: {
          status: "FAILED",
          processingError:
            error.message || "Unknown error occurred during processing",
        },
      });
      throw error;
    }
  },
  { connection: redis },
);

worker.on("ready", () => {
  logger.info(`🎧 Worker listening for jobs on queue: ${INGESTION_QUEUE_NAME}`);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down worker...");
  await worker.close();
  process.exit(0);
});
