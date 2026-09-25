import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDeleteMany = vi.fn();
const mockUpsert = vi.fn();
const mockNamespace = vi.fn().mockReturnValue({
  deleteMany: mockDeleteMany,
  upsert: mockUpsert,
});

vi.mock("@pinecone-database/pinecone", () => {
  return {
    Pinecone: class {
      Index() {
        return {
          namespace: mockNamespace,
        };
      }
    },
  };
});

const { pineconeService } = await import("../../services/pinecone.service.js");

describe("pineconeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deleteDocumentVectors", () => {
    const tenantId = "org-tenant-123";
    const documentId = "doc-456";

    it("should delete vectors from the correct tenant namespace", async () => {
      mockDeleteMany.mockResolvedValue({});
      const chunkIds = ["chunk-1", "chunk-2"];

      await pineconeService.deleteDocumentVectors(
        tenantId,
        documentId,
        chunkIds,
      );

      expect(mockNamespace).toHaveBeenCalledWith(tenantId);
      expect(mockDeleteMany).toHaveBeenCalledTimes(1);
      expect(mockDeleteMany).toHaveBeenCalledWith({ ids: chunkIds });
    });

    it("should handle empty chunk list without calling Pinecone", async () => {
      await pineconeService.deleteDocumentVectors(tenantId, documentId, []);

      expect(mockNamespace).not.toHaveBeenCalled();
      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it("should batch vector deletions in groups of 1000", async () => {
      mockDeleteMany.mockResolvedValue({});
      const chunkIds = Array.from({ length: 2500 }, (_, i) => `chunk-${i}`);

      await pineconeService.deleteDocumentVectors(
        tenantId,
        documentId,
        chunkIds,
      );

      expect(mockNamespace).toHaveBeenCalledWith(tenantId);
      expect(mockDeleteMany).toHaveBeenCalledTimes(3);
      expect(mockDeleteMany).toHaveBeenNthCalledWith(1, {
        ids: chunkIds.slice(0, 1000),
      });
      expect(mockDeleteMany).toHaveBeenNthCalledWith(2, {
        ids: chunkIds.slice(1000, 2000),
      });
      expect(mockDeleteMany).toHaveBeenNthCalledWith(3, {
        ids: chunkIds.slice(2000, 2500),
      });
    });

    it("should propagate errors if Pinecone delete fails", async () => {
      mockDeleteMany.mockRejectedValue(new Error("Pinecone network timeout"));
      const chunkIds = ["chunk-1"];

      await expect(
        pineconeService.deleteDocumentVectors(tenantId, documentId, chunkIds),
      ).rejects.toThrow("Pinecone network timeout");
    });
  });

  describe("upsertChunks", () => {
    const tenantId = "org-tenant-123";
    const documentId = "doc-456";

    it("should upsert records into the correct tenant namespace", async () => {
      mockUpsert.mockResolvedValue({});
      const chunks = [
        { id: "chunk-1", content: "hello world", chunkIndex: 0, pageNumber: 1 },
      ];
      const embeddings = [[0.1, 0.2, 0.3]];

      await pineconeService.upsertChunks(
        tenantId,
        documentId,
        chunks,
        embeddings,
      );

      expect(mockNamespace).toHaveBeenCalledWith(tenantId);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalledWith({
        records: [
          {
            id: "chunk-1",
            values: [0.1, 0.2, 0.3],
            metadata: {
              documentId,
              chunkIndex: 0,
              content: "hello world",
              pageNumber: 1,
            },
          },
        ],
      });
    });
  });
});
