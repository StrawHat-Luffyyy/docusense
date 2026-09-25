import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockDocumentFindUnique = vi.fn();
const mockDocumentChunkFindMany = vi.fn();
const mockDocumentDelete = vi.fn();
const mockTenantUsageUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockS3DeleteObject = vi.fn();
const mockPineconeDeleteVectors = vi.fn();

vi.mock("../../config/database.js", () => ({
  db: {
    document: {
      findUnique: mockDocumentFindUnique,
      delete: mockDocumentDelete,
    },
    documentChunk: {
      findMany: mockDocumentChunkFindMany,
    },
    tenantUsage: {
      update: mockTenantUsageUpdate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("../../services/s3.service.js", () => ({
  s3Service: {
    deleteObject: mockS3DeleteObject,
  },
}));

vi.mock("../../services/pinecone.service.js", () => ({
  pineconeService: {
    deleteDocumentVectors: mockPineconeDeleteVectors,
  },
}));

vi.mock("../../middleware/auth.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
  injectTenantContext: (req: any, res: any, next: any) => next(),
}));

vi.mock("../../middleware/rateLimit.middleware.js", () => ({
  rateLimiters: {
    upload: (req: any, res: any, next: any) => next(),
    mutation: (req: any, res: any, next: any) => next(),
    chat: (req: any, res: any, next: any) => next(),
    read: (req: any, res: any, next: any) => next(),
  },
}));

const { documentsRouter } = await import("../../routes/documents.route.js");

// Extract the DELETE /:id route handler function from the router stack
const deleteRouteLayer = documentsRouter.stack.find(
  (layer: any) => layer.route?.path === "/:id" && layer.route?.methods?.delete,
);
const deleteHandler =
  deleteRouteLayer!.route!.stack[deleteRouteLayer!.route!.stack.length - 1]
    .handle;

describe("Document Deletion Flow", () => {
  const TENANT_ID = "tenant-alpha";
  const OTHER_TENANT_ID = "tenant-bravo";
  const DOC_ID = "doc-12345";

  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: { id: DOC_ID },
      tenantId: TENANT_ID,
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    mockTransaction.mockImplementation(async (ops: any[]) => ops);
  });

  it("should successfully delete document, Pinecone vectors, S3 object, and DB rows", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      organizationId: TENANT_ID,
      storageKey: "uploads/doc-12345.pdf",
    });
    mockDocumentChunkFindMany.mockResolvedValue([
      { id: "chunk-1" },
      { id: "chunk-2" },
    ]);
    mockPineconeDeleteVectors.mockResolvedValue(undefined);
    mockS3DeleteObject.mockResolvedValue(undefined);

    await deleteHandler(req, res, next);

    // 1. Chunks fetched
    expect(mockDocumentChunkFindMany).toHaveBeenCalledWith({
      where: { documentId: DOC_ID },
      select: { id: true },
    });

    // 2. Pinecone vectors deleted before DB deletion
    expect(mockPineconeDeleteVectors).toHaveBeenCalledWith(TENANT_ID, DOC_ID, [
      "chunk-1",
      "chunk-2",
    ]);

    // 3. S3 object deleted
    expect(mockS3DeleteObject).toHaveBeenCalledWith("uploads/doc-12345.pdf");

    // 4. DB transaction executed
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockDocumentDelete).toHaveBeenCalledWith({ where: { id: DOC_ID } });
    expect(mockTenantUsageUpdate).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID },
      data: { documentCount: { decrement: 1 } },
    });

    // 5. Response 200
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Document deleted" });
  });

  it("should handle document with multiple chunks correctly", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      organizationId: TENANT_ID,
      storageKey: "uploads/multi-chunk.pdf",
    });
    const fakeChunks = Array.from({ length: 50 }, (_, i) => ({
      id: `chunk-${i + 1}`,
    }));
    mockDocumentChunkFindMany.mockResolvedValue(fakeChunks);
    mockPineconeDeleteVectors.mockResolvedValue(undefined);
    mockS3DeleteObject.mockResolvedValue(undefined);

    await deleteHandler(req, res, next);

    expect(mockPineconeDeleteVectors).toHaveBeenCalledWith(
      TENANT_ID,
      DOC_ID,
      fakeChunks.map((c) => c.id),
    );
    expect(mockTransaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should abort DB and S3 deletion if Pinecone deletion fails", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      organizationId: TENANT_ID,
      storageKey: "uploads/doc-12345.pdf",
    });
    mockDocumentChunkFindMany.mockResolvedValue([{ id: "chunk-1" }]);
    const pineconeError = new Error("Pinecone service unavailable");
    mockPineconeDeleteVectors.mockRejectedValue(pineconeError);

    await deleteHandler(req, res, next);

    // S3 delete and DB transaction must NOT be called when Pinecone fails
    expect(mockS3DeleteObject).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockDocumentDelete).not.toHaveBeenCalled();

    // Error is passed to next() for global error handling
    expect(next).toHaveBeenCalledWith(pineconeError);
  });

  it("should return 404 for nonexistent document without calling external services", async () => {
    mockDocumentFindUnique.mockResolvedValue(null);

    await deleteHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Document not found" });
    expect(mockDocumentChunkFindMany).not.toHaveBeenCalled();
    expect(mockPineconeDeleteVectors).not.toHaveBeenCalled();
    expect(mockS3DeleteObject).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("should handle repeated deletion idempotently (returns 404 on second call)", async () => {
    // First call succeeds
    mockDocumentFindUnique.mockResolvedValueOnce({
      id: DOC_ID,
      organizationId: TENANT_ID,
      storageKey: "uploads/doc-12345.pdf",
    });
    mockDocumentChunkFindMany.mockResolvedValueOnce([]);
    mockS3DeleteObject.mockResolvedValueOnce(undefined);

    await deleteHandler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

    // Second call: document no longer exists
    vi.clearAllMocks();
    mockDocumentFindUnique.mockResolvedValueOnce(null);

    await deleteHandler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Document not found" });
    expect(mockPineconeDeleteVectors).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("should preserve tenant isolation and return 404 if document belongs to another tenant", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      organizationId: OTHER_TENANT_ID, // Belongs to tenant-bravo
      storageKey: "uploads/doc-12345.pdf",
    });

    // Request is made by tenant-alpha
    await deleteHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Document not found" });
    expect(mockDocumentChunkFindMany).not.toHaveBeenCalled();
    expect(mockPineconeDeleteVectors).not.toHaveBeenCalled();
    expect(mockS3DeleteObject).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("should continue with DB deletion if S3 deletion fails (best-effort)", async () => {
    mockDocumentFindUnique.mockResolvedValue({
      id: DOC_ID,
      organizationId: TENANT_ID,
      storageKey: "uploads/doc-12345.pdf",
    });
    mockDocumentChunkFindMany.mockResolvedValue([{ id: "chunk-1" }]);
    mockPineconeDeleteVectors.mockResolvedValue(undefined);
    mockS3DeleteObject.mockRejectedValue(new Error("S3 AccessDenied"));

    await deleteHandler(req, res, next);

    // Pinecone succeeded, S3 failed, DB transaction should still execute
    expect(mockPineconeDeleteVectors).toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Document deleted" });
  });
});
