import { describe, it, expect } from "vitest";
import { chunkingService } from "../../services/chunking.service.js";

describe("chunkingService", () => {
  describe("splitText", () => {
    it("should split text into chunks", async () => {
      const text = "Hello world. ".repeat(200); // ~2600 chars
      const chunks = await chunkingService.splitText(text);

      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(typeof chunk).toBe("string");
        expect(chunk.length).toBeGreaterThan(0);
        expect(chunk.length).toBeLessThanOrEqual(1100); // chunk size + tolerance
      });
    });

    it("should return a single chunk for short text", async () => {
      const text = "Short text that fits in one chunk.";
      const chunks = await chunkingService.splitText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it("should return empty array for empty text", async () => {
      const chunks = await chunkingService.splitText("");
      expect(chunks).toHaveLength(0);
    });

    it("should preserve content — no data loss", async () => {
      const sentences = Array.from(
        { length: 50 },
        (_, i) => `Sentence number ${i + 1} with some content.`,
      );
      const text = sentences.join("\n");
      const chunks = await chunkingService.splitText(text);

      // Every sentence should appear in at least one chunk
      for (const sentence of sentences) {
        const found = chunks.some((chunk) => chunk.includes(sentence));
        expect(found).toBe(true);
      }
    });
  });

  describe("splitTextWithPages", () => {
    it("should track page numbers using form-feed characters", async () => {
      const page1 = "Page one content. ".repeat(20);
      const page2 = "Page two content. ".repeat(20);
      const page3 = "Page three content. ".repeat(20);
      const text = [page1, page2, page3].join("\f");

      const chunks = await chunkingService.splitTextWithPages(text);

      expect(chunks.length).toBeGreaterThan(0);

      // All chunks should have page numbers 1, 2, or 3
      const pageNumbers = new Set(chunks.map((c) => c.pageNumber));
      expect(pageNumbers.size).toBeLessThanOrEqual(3);
      expect(pageNumbers.has(1)).toBe(true);

      // Each chunk should have content and a page number
      chunks.forEach((chunk) => {
        expect(chunk.content).toBeTruthy();
        expect(chunk.pageNumber).toBeGreaterThanOrEqual(1);
      });
    });

    it("should assign page 1 when no form-feeds exist", async () => {
      const text = "No form feeds here. ".repeat(200);
      const chunks = await chunkingService.splitTextWithPages(text);

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.pageNumber).toBe(1);
      });
    });

    it("should skip empty pages", async () => {
      const text = "Content on page one.\f\f\fContent on page four.";
      const chunks = await chunkingService.splitTextWithPages(text);

      const pageNumbers = chunks.map((c) => c.pageNumber);
      // Pages 2 and 3 are empty, should not produce chunks
      expect(pageNumbers).not.toContain(2);
      expect(pageNumbers).not.toContain(3);
    });

    it("should return content and pageNumber for each chunk", async () => {
      const text = "First page.\fSecond page.";
      const chunks = await chunkingService.splitTextWithPages(text);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      chunks.forEach((chunk) => {
        expect(chunk).toHaveProperty("content");
        expect(chunk).toHaveProperty("pageNumber");
        expect(typeof chunk.content).toBe("string");
        expect(typeof chunk.pageNumber).toBe("number");
      });
    });

    it("should handle single-page documents", async () => {
      const text = "Just one page of content here.";
      const chunks = await chunkingService.splitTextWithPages(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].pageNumber).toBe(1);
      expect(chunks[0].content).toBe(text);
    });
  });
});
