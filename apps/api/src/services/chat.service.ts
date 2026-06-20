import { Pinecone } from "@pinecone-database/pinecone";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { db } from "../config/database.js";
import { embeddingService } from "./embedding.service.js";

const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

const index = pinecone.Index(env.PINECONE_INDEX);

export const chatService = {
  /**
   * Embeds the user query, searches Pinecone, and fetches the full text from PostgreSQL.
   */
  async retrieveContext(tenantId: string, query: string, topK: number = 3) {
    logger.debug(`Retrieving context for query : "${query}"`);

    const queryEmbedding = await embeddingService.createEmbeddings([query]);
    //console.log(queryEmbedding);
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
            filename: true,
          },
        },
      },
    });
    return chunks;
  },
};
