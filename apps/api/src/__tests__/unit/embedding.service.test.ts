import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Google Generative AI module — use class-style mock for constructor
const mockBatchEmbedContents = vi.fn();

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          batchEmbedContents: mockBatchEmbedContents,
        };
      }
    },
  };
});

// Must import after mocks are set up
const { embeddingService } =
  await import("../../services/embedding.service.js");

describe("embeddingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEmbeddings", () => {
    it("should return embedding vectors for given texts", async () => {
      const fakeEmbeddings = [
        { values: [0.1, 0.2, 0.3] },
        { values: [0.4, 0.5, 0.6] },
      ];
      mockBatchEmbedContents.mockResolvedValue({
        embeddings: fakeEmbeddings,
      });

      const result = await embeddingService.createEmbeddings([
        "Hello world",
        "Test text",
      ]);

      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
    });

    it("should call batchEmbedContents with correct request format", async () => {
      mockBatchEmbedContents.mockResolvedValue({
        embeddings: [{ values: [0.1] }],
      });

      await embeddingService.createEmbeddings(["Test"]);

      expect(mockBatchEmbedContents).toHaveBeenCalledWith({
        requests: [
          {
            content: {
              role: "user",
              parts: [{ text: "Test" }],
            },
          },
        ],
      });
    });

    it("should handle multiple texts in a single batch", async () => {
      const texts = ["Text 1", "Text 2", "Text 3"];
      mockBatchEmbedContents.mockResolvedValue({
        embeddings: texts.map(() => ({ values: [0.1, 0.2] })),
      });

      const result = await embeddingService.createEmbeddings(texts);

      expect(result).toHaveLength(3);
      expect(mockBatchEmbedContents).toHaveBeenCalledTimes(1);
      const call = mockBatchEmbedContents.mock.calls[0][0];
      expect(call.requests).toHaveLength(3);
    });

    it("should throw on API error", async () => {
      mockBatchEmbedContents.mockRejectedValue(
        new Error("Gemini API rate limit"),
      );

      await expect(embeddingService.createEmbeddings(["fail"])).rejects.toThrow(
        "Gemini API rate limit",
      );
    });
  });
});
