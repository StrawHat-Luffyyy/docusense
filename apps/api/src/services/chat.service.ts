import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { db } from "../config/database.js";
import { embeddingService } from "./embedding.service.js";
import type { Citation, RetrievedChunk } from "../types/citation.js";

const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

const index = pinecone.Index(env.PINECONE_INDEX);

const CONTENT_PREVIEW_LENGTH = 200;

export const chatService = {
  /**
   * Embeds the user query, searches Pinecone, and fetches the full text
   * from PostgreSQL. Returns chunks enriched with similarity scores.
   */
  async retrieveContext(
    tenantId: string,
    query: string,
    topK: number = 3,
  ): Promise<RetrievedChunk[]> {
    logger.debug(`Retrieving context for query : "${query}"`);

    const queryEmbedding = await embeddingService.createEmbeddings([query]);
    const queryVector = queryEmbedding[0];

    const queryResponse = await index.namespace(tenantId).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      logger.debug("No relevant context found in Pinecone.");
      return [];
    }

    // Build a map of chunkId → similarity score
    const scoreMap = new Map<string, number>();
    for (const match of queryResponse.matches) {
      scoreMap.set(match.id, match.score ?? 0);
    }

    const chunkIds = queryResponse.matches.map((match) => match.id);

    const chunks = await db.documentChunk.findMany({
      where: {
        id: {
          in: chunkIds,
        },
        document: {
          organizationId: tenantId,
        },
      },
      include: {
        document: {
          select: {
            id: true,
            filename: true,
          },
        },
      },
    });

    // Enrich with scores and sort by score descending
    const enriched: RetrievedChunk[] = chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      documentId: chunk.documentId,
      document: {
        id: chunk.document.id,
        filename: chunk.document.filename,
      },
      score: scoreMap.get(chunk.id) ?? 0,
    }));

    enriched.sort((a, b) => b.score - a.score);

    return enriched;
  },

  /**
   * Converts retrieved chunks into structured Citation objects
   * suitable for the API response.
   */
  formatCitations(chunks: RetrievedChunk[]): Citation[] {
    const seen = new Set<string>();
    const uniqueChunks = chunks.filter((chunk) => {
      if (seen.has(chunk.id)) return false;
      seen.add(chunk.id);
      return true;
    });

    return uniqueChunks.map((chunk) => ({
      documentId: chunk.document.id,
      documentName: chunk.document.filename,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      chunkId: chunk.id,
      contentPreview:
        chunk.content.length > CONTENT_PREVIEW_LENGTH
          ? chunk.content.substring(0, CONTENT_PREVIEW_LENGTH) + "…"
          : chunk.content,
      score: Math.round(chunk.score * 1000) / 1000, // 3 decimal places
    }));
  },
};
