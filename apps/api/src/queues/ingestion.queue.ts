import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "../config/redis.js";
import { logger } from "../utils/logger.js";

export const INGESTION_QUEUE_NAME = "document-ingestion";

export const ingestionQueue = new Queue(INGESTION_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

ingestionQueue.on("error", (err) => {
  logger.error({ err }, "BullMQ Ingestion Queue Error");
});

export const enqueueDocumentProcessing = async (payload: {
  documentId: string;
  tenantId: string;
  storageKey: string;
}) => {
  await ingestionQueue.add("process-document", payload);
};
