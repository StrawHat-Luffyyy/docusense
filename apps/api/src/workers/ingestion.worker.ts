import { Worker, Job } from "bullmq";
import { redis } from "../config/redis.js";
import { db } from "../config/database.js";
import { s3Service } from "../services/s3.service.js";
import { logger } from "../utils/logger.js";
import { INGESTION_QUEUE_NAME } from "../queues/ingestion.queue.js";

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

      await db.document.update({
        where: { id: documentId },
        data: {
          status: "INDEXED",
          pageCount: pdfData.numpages,
        },
      });
      logger.info(
        { documentId },
        "Job Complete: Document Processed Successfully",
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
  { connection: redis }, // ✅ moved here from process.on
);

worker.on("ready", () => {
  logger.info(`🎧 Worker listening for jobs on queue: ${INGESTION_QUEUE_NAME}`);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down worker...");
  await worker.close();
  process.exit(0);
}); // ✅ no third argument
