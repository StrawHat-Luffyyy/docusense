import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

export const embeddingService = {
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    logger.debug(`Calling Gemini to embed ${texts.length} chunks...`);

    try {
      const requests = texts.map((text) => ({
        content: {
          role: "user",
          parts: [{ text }],
        },
      }));

      const result = await model.batchEmbedContents({
        requests,
      });

      //console.log("Embedding dimension:", result.embeddings[0].values.length);

      return result.embeddings.map((e) => e.values);
    } catch (error) {
      logger.error({ err: error }, "Gemini Embedding Error");
      throw new Error("Failed to generate embeddings via Gemini");
    }
  },
};
