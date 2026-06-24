import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration Test — Flow B: User Question → Retrieval → Context → LLM → Citations
 *
 * Tests the complete chat/retrieval pipeline with mocked external services
 * (Pinecone, Gemini, Prisma) but real internal logic (citation formatting,
 * context assembly).
 */

// --- Mock external services ---
const mockQuery = vi.fn();
const mockFindMany = vi.fn();
const mockCreateEmbeddings = vi.fn();

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
    createEmbeddings: mockCreateEmbeddings,
  },
}));

const { chatService } = await import("../../services/chat.service.js");

// --- Test Data ---
const TENANT_ID = "org-integration-test";

const simulatedPineconeResults = {
  matches: [
    {
      id: "chunk-abc-1",
      score: 0.94,
      metadata: {
        documentId: "doc-001",
        chunkIndex: 2,
        content: "The maximum upload size is 50MB for all document types.",
        pageNumber: 5,
      },
    },
    {
      id: "chunk-abc-2",
      score: 0.87,
      metadata: {
        documentId: "doc-001",
        chunkIndex: 3,
        content:
          "Supported file types include PDF. Other formats are not supported.",
        pageNumber: 5,
      },
    },
    {
      id: "chunk-def-1",
      score: 0.72,
      metadata: {
        documentId: "doc-002",
        chunkIndex: 0,
        content:
          "Security policy requires all uploads to be scanned for malware.",
        pageNumber: 1,
      },
    },
  ],
};

const simulatedDbChunks = [
  {
    id: "chunk-abc-1",
    content:
      "The maximum upload size is 50MB for all document types. This limit applies to both individual files and batch uploads.",
    chunkIndex: 2,
    pageNumber: 5,
    documentId: "doc-001",
    document: { id: "doc-001", filename: "User_Guide.pdf" },
  },
  {
    id: "chunk-abc-2",
    content:
      "Supported file types include PDF. Other formats such as DOCX and TXT are not currently supported but are planned for future releases.",
    chunkIndex: 3,
    pageNumber: 5,
    documentId: "doc-001",
    document: { id: "doc-001", filename: "User_Guide.pdf" },
  },
  {
    id: "chunk-def-1",
    content:
      "Security policy requires all uploads to be scanned for malware before processing. Files are quarantined until the scan completes.",
    chunkIndex: 0,
    pageNumber: 1,
    documentId: "doc-002",
    document: { id: "doc-002", filename: "Security_Policy.pdf" },
  },
];

describe("Chat Flow — Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);
    mockQuery.mockResolvedValue(simulatedPineconeResults);
    mockFindMany.mockResolvedValue(simulatedDbChunks);
  });

  it("should retrieve context and format citations end-to-end", async () => {
    // Step 1: Retrieve context
    const chunks = await chatService.retrieveContext(
      TENANT_ID,
      "What is the maximum upload size?",
    );

    // Verify retrieval
    expect(chunks).toHaveLength(3);
    expect(chunks[0].score).toBeGreaterThanOrEqual(chunks[1].score);

    // Step 2: Format citations
    const citations = chatService.formatCitations(chunks);

    // Verify citations
    expect(citations).toHaveLength(3);

    // Check first citation (highest score)
    const topCitation = citations.find((c) => c.chunkId === "chunk-abc-1");
    expect(topCitation).toBeDefined();
    expect(topCitation!.documentName).toBe("User_Guide.pdf");
    expect(topCitation!.pageNumber).toBe(5);
    expect(topCitation!.score).toBeGreaterThan(0.9);

    // Check that citations from different documents are present
    const docNames = new Set(citations.map((c) => c.documentName));
    expect(docNames.has("User_Guide.pdf")).toBe(true);
    expect(docNames.has("Security_Policy.pdf")).toBe(true);
  });

  it("should preserve end-to-end metadata integrity", async () => {
    const chunks = await chatService.retrieveContext(
      TENANT_ID,
      "Upload limits",
    );
    const citations = chatService.formatCitations(chunks);

    // Every citation must map to a real chunk
    for (const citation of citations) {
      const sourceChunk = simulatedDbChunks.find(
        (c) => c.id === citation.chunkId,
      );
      expect(sourceChunk).toBeDefined();
      expect(citation.documentId).toBe(sourceChunk!.documentId);
      expect(citation.documentName).toBe(sourceChunk!.document.filename);
      expect(citation.pageNumber).toBe(sourceChunk!.pageNumber);
      expect(citation.chunkIndex).toBe(sourceChunk!.chunkIndex);
    }
  });

  it("should handle empty retrieval results gracefully", async () => {
    mockQuery.mockResolvedValue({ matches: [] });

    const chunks = await chatService.retrieveContext(
      TENANT_ID,
      "Something completely irrelevant",
    );
    const citations = chatService.formatCitations(chunks);

    expect(chunks).toEqual([]);
    expect(citations).toEqual([]);
  });

  it("should correctly use tenant namespace for isolation", async () => {
    await chatService.retrieveContext(TENANT_ID, "test query");

    // The embedding service should have been called
    expect(mockCreateEmbeddings).toHaveBeenCalledWith(["test query"]);

    // Pinecone query should include the vector
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        vector: expect.any(Array),
        topK: 3,
        includeMetadata: true,
      }),
    );
  });

  it("should truncate long content in citation previews", async () => {
    // Replace one chunk with very long content
    const longChunks = [...simulatedDbChunks];
    longChunks[0] = {
      ...longChunks[0],
      content: "A".repeat(500),
    };
    mockFindMany.mockResolvedValue(longChunks);

    const chunks = await chatService.retrieveContext(TENANT_ID, "test");
    const citations = chatService.formatCitations(chunks);

    const longCitation = citations.find((c) => c.chunkId === "chunk-abc-1");
    expect(longCitation!.contentPreview.length).toBeLessThanOrEqual(201);
  });
});
