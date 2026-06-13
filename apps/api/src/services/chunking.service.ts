import { logger } from "../utils/logger.js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkingService = {
  /**
   * Splits raw text into semantic, overlapping chunks.
   */
  async splitText(text: string): Promise<string[]> {
    logger.debug("Initializing RecursiveCharacterTextSplitter...");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", " ", ""],
    });

    const docs = await splitter.createDocuments([text]);
    return docs.map((doc) => doc.pageContent);
  },
};
