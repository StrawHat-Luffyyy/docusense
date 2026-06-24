import { logger } from "../utils/logger.js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { ChunkWithPage } from "../types/citation.js";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const SEPARATORS = ["\n\n", "\n", " ", ""];

export const chunkingService = {
  /**
   * Splits raw text into semantic, overlapping chunks.
   * Backward-compatible — does not track pages.
   */
  async splitText(text: string): Promise<string[]> {
    logger.debug("Initializing RecursiveCharacterTextSplitter...");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      separators: SEPARATORS,
    });

    const docs = await splitter.createDocuments([text]);
    return docs.map((doc) => doc.pageContent);
  },

  /**
   * Splits raw text into overlapping chunks WITH page number tracking.
   *
   * Strategy: pdf-parse preserves form-feed characters (\f) at page
   * boundaries. We split on \f first to get per-page text, then chunk
   * each page individually while tracking which page every chunk
   * originated from.
   *
   * If a chunk spans a page boundary (due to overlap), it is attributed
   * to the page where the chunk starts.
   */
  async splitTextWithPages(text: string): Promise<ChunkWithPage[]> {
    logger.debug("Splitting text with page tracking...");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: CHUNK_OVERLAP,
      separators: SEPARATORS,
    });

    // Split on form-feed to get per-page text
    const pages = text.split("\f");
    const results: ChunkWithPage[] = [];

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageText = pages[pageIndex].trim();
      if (!pageText) continue;

      const pageNumber = pageIndex + 1; // 1-indexed page numbers
      const docs = await splitter.createDocuments([pageText]);

      for (const doc of docs) {
        results.push({
          content: doc.pageContent,
          pageNumber,
        });
      }
    }

    // Fallback: if no form-feeds were found (single "page"), chunk the
    // entire text and assign page 1
    if (pages.length <= 1 && results.length === 0) {
      const docs = await splitter.createDocuments([text]);
      for (const doc of docs) {
        results.push({
          content: doc.pageContent,
          pageNumber: 1,
        });
      }
    }

    logger.info(
      `Generated ${results.length} page-tracked chunks across ${pages.length} pages`,
    );
    return results;
  },
};
