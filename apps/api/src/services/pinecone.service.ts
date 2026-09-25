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
    chunks: {
      id: string;
      content: string;
      chunkIndex: number;
      pageNumber?: number | null;
    }[],
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
        ...(chunk.pageNumber != null && { pageNumber: chunk.pageNumber }),
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

  /**
   * Deletes all vectors belonging to a document from its tenant namespace.
   *
   * Vector IDs in Pinecone match DocumentChunk UUIDs from Postgres.
   * Callers must provide the chunk IDs *before* deleting the DB rows,
   * since cascading DB deletion would erase the ID references.
   *
   * Idempotent — deleting non-existent IDs is a no-op in Pinecone.
   */
  async deleteDocumentVectors(
    tenantId: string,
    documentId: string,
    chunkIds: string[],
  ): Promise<void> {
    if (chunkIds.length === 0) {
      logger.debug(
        { documentId },
        "No chunk IDs to delete from Pinecone — skipping",
      );
      return;
    }

    logger.debug(
      `Deleting ${chunkIds.length} vectors from Pinecone namespace: ${tenantId} for document: ${documentId}`,
    );

    const DELETE_BATCH_SIZE = 1000;
    for (let i = 0; i < chunkIds.length; i += DELETE_BATCH_SIZE) {
      const batch = chunkIds.slice(i, i + DELETE_BATCH_SIZE);
      await index.namespace(tenantId).deleteMany({ ids: batch });
    }

    logger.info(
      { documentId, vectorCount: chunkIds.length },
      `Successfully deleted vectors for document ${documentId}`,
    );
  },
};
