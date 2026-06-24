import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockQuery = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@pinecone-database/pinecone", () => {
  return {
    Pinecone: class {
      Index() {
        return {
          namespace() {
            return {
              query: mockQuery,
            };
          },
        };
      }
    },
  };
});

vi.mock("../../config/database.js", () => ({
  db: {
    documentChunk: {
      findMany: mockFindMany,
    },
  },
}));

vi.mock("../../services/embedding.service.js", () => ({
  embeddingService: {
    createEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3, 0.4, 0.5]]),
  },
}));

const { chatService } = await import("../../services/chat.service.js");
import {
  mockDbChunks,
  mockPineconeMatches,
} from "../fixtures/sample-chunks.js";

// --- Test Data ---
const TENANT_ID = "test-tenant-123";

describe("chatService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("retrieveContext", () => {
    it("should return enriched chunks sorted by score", async () => {
      mockQuery.mockResolvedValue({ matches: mockPineconeMatches });
      mockFindMany.mockResolvedValue(mockDbChunks);

      const result = await chatService.retrieveContext(TENANT_ID, "test query");

      expect(result).toHaveLength(3);
      // Should be sorted by score descending
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
      expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
    });

    it("should include document metadata in results", async () => {
      mockQuery.mockResolvedValue({ matches: mockPineconeMatches });
      mockFindMany.mockResolvedValue(mockDbChunks);

      const result = await chatService.retrieveContext(TENANT_ID, "test query");

      result.forEach((chunk) => {
        expect(chunk).toHaveProperty("document");
        expect(chunk.document).toHaveProperty("id");
        expect(chunk.document).toHaveProperty("filename");
        expect(chunk).toHaveProperty("pageNumber");
        expect(chunk).toHaveProperty("chunkIndex");
        expect(chunk).toHaveProperty("score");
      });
    });

    it("should return empty array when no matches found", async () => {
      mockQuery.mockResolvedValue({ matches: [] });

      const result = await chatService.retrieveContext(
        TENANT_ID,
        "obscure query",
      );

      expect(result).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("should handle null matches from Pinecone", async () => {
      mockQuery.mockResolvedValue({ matches: null });

      const result = await chatService.retrieveContext(TENANT_ID, "test query");

      expect(result).toEqual([]);
    });

    it("should pass correct topK to Pinecone", async () => {
      mockQuery.mockResolvedValue({ matches: [] });

      await chatService.retrieveContext(TENANT_ID, "query", 7);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({ topK: 7 }),
      );
    });
  });
});
