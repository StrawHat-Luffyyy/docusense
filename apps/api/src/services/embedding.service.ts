import OpenAI from "openai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const embeddingService = {
  /**
   * Converts an array of strings into an array of vector arrays
   */

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    logger.debug(`Calling OpenAI to embed ${texts.length} chunks...`);

    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: texts,
      dimensions: 3072,
    });

    return response.data.map((item) => item.embedding);
  },
};
