import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});
const index = pinecone.Index(env.PINECONE_INDEX);

export const pineconeService = {
  /**
   * Upserts vectorized chunks into a strictly isolated tenant namespace
   */
  async upsertChunks(
    tenantId: string,
    documentId: string,
    chunks: { id: string; content: string; chunkIndex: number }[],
    embeddings: number[][],
  ) {
    logger.debug(
      `Upserting ${chunks.length} vectors to Pinecone namespace : ${tenantId}`,
    );

    const records: PineconeRecord[] = chunks.map((chunk, i) => ({
      id: chunk.id,
      values: embeddings[i],
      metadata: {
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
      },
    }));
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await index.namespace(tenantId).upsert({
        records: batch,
      });
    }
    logger.info(`Successfully upserted vectors for document ${documentId}`);
  },
};
