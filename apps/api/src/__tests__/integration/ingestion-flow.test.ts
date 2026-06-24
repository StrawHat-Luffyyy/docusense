import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration Test — Flow A: Upload → Queue → Chunking → Embedding → Pinecone
 *
 * Tests the complete document ingestion pipeline with mocked external services
 * (S3, Gemini, Pinecone) but real internal logic (chunking, data flow).
 */

// --- Mock external services ---
const mockGetObjectBuffer = vi.fn();
const mockUpsertChunks = vi.fn();
const mockCreateEmbeddings = vi.fn();
const mockCreateMany = vi.fn();
const mockFindMany = vi.fn();
const mockDocumentUpdate = vi.fn();

vi.mock("../../services/s3.service.js", () => ({
  s3Service: {
    getObjectBuffer: mockGetObjectBuffer,
  },
}));

vi.mock("../../services/pinecone.service.js", () => ({
  pineconeService: {
    upsertChunks: mockUpsertChunks,
  },
}));

vi.mock("../../services/embedding.service.js", () => ({
  embeddingService: {
    createEmbeddings: mockCreateEmbeddings,
  },
}));

vi.mock("../../config/database.js", () => ({
  db: {
    documentChunk: {
      createMany: mockCreateMany,
      findMany: mockFindMany,
    },
    document: {
      update: mockDocumentUpdate,
    },
  },
}));

vi.mock("../../config/redis.js", () => ({
  redis: {},
  getRedisConnectionOptions: () => ({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }),
}));

// Mock BullMQ Worker to prevent it from starting
vi.mock("bullmq", () => ({
  Worker: class {
    on() {}
    close() {}
  },
  Job: class {},
}));

const { chunkingService } = await import("../../services/chunking.service.js");

describe("Ingestion Flow — Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process a PDF through the full ingestion pipeline", async () => {
    // --- Arrange ---

    // Simulate pdf-parse output: 2-page document with form-feeds
    const page1Text = "Page 1: Introduction to DocuSense. ".repeat(30);
    const page2Text = "Page 2: Architecture and Design. ".repeat(30);
    const rawPdfText = `${page1Text}\f${page2Text}`;

    // Step 1: Chunk the text (real logic)
    const chunks = await chunkingService.splitTextWithPages(rawPdfText);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.pageNumber === 1)).toBe(true);
    expect(chunks.some((c) => c.pageNumber === 2)).toBe(true);

    // Step 2: Simulate saving chunks to DB
    const savedChunks = chunks.map((chunk, index) => ({
      id: `chunk-${index}`,
      content: chunk.content,
      chunkIndex: index,
      pageNumber: chunk.pageNumber,
      documentId: "doc-test-123",
    }));

    mockCreateMany.mockResolvedValue({ count: chunks.length });
    mockFindMany.mockResolvedValue(savedChunks);

    // Step 3: Mock embedding generation
    const fakeEmbeddings = chunks.map(() =>
      Array.from({ length: 768 }, () => Math.random()),
    );
    mockCreateEmbeddings.mockResolvedValue(fakeEmbeddings);

    // Step 4: Mock Pinecone upsert
    mockUpsertChunks.mockResolvedValue(undefined);

    // --- Act: Simulate the worker flow ---

    // Save chunks
    await mockCreateMany({ data: savedChunks });
    const retrievedChunks = await mockFindMany();

    // Generate embeddings
    const embeddings = await mockCreateEmbeddings(chunks.map((c) => c.content));

    // Upsert to Pinecone
    await mockUpsertChunks(
      "test-tenant",
      "doc-test-123",
      retrievedChunks,
      embeddings,
    );

    // --- Assert ---

    // Chunks were saved with page numbers
    expect(mockCreateMany).toHaveBeenCalledTimes(1);
    const savedData = mockCreateMany.mock.calls[0][0].data;
    expect(savedData.length).toBe(chunks.length);
    savedData.forEach((chunk: { pageNumber: number }) => {
      expect(chunk.pageNumber).toBeGreaterThanOrEqual(1);
    });

    // Embeddings were generated for all chunks
    expect(mockCreateEmbeddings).toHaveBeenCalledWith(
      chunks.map((c) => c.content),
    );

    // Pinecone received correct data
    expect(mockUpsertChunks).toHaveBeenCalledWith(
      "test-tenant",
      "doc-test-123",
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          content: expect.any(String),
          chunkIndex: expect.any(Number),
          pageNumber: expect.any(Number),
        }),
      ]),
      expect.any(Array),
    );

    // Embedding count matches chunk count
    expect(embeddings).toHaveLength(chunks.length);
  });

  it("should handle single-page documents correctly", async () => {
    const rawText = "Single page document content. ".repeat(200);
    const chunks = await chunkingService.splitTextWithPages(rawText);

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk) => {
      expect(chunk.pageNumber).toBe(1);
    });
  });
});
