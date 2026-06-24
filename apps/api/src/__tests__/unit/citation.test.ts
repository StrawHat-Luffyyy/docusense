import { describe, it, expect } from "vitest";
import { chatService } from "../../services/chat.service.js";

describe("citation.test.ts - Citation Generation", () => {
  it("should convert retrieved chunks to Citation objects", () => {
    const chunks = [
      {
        id: "chunk-1",
        content: "Some content here",
        chunkIndex: 0,
        pageNumber: 3,
        documentId: "doc-1",
        document: { id: "doc-1", filename: "test.pdf" },
        score: 0.956,
      },
    ];

    const citations = chatService.formatCitations(chunks);

    expect(citations).toHaveLength(1);
    expect(citations[0]).toEqual({
      documentId: "doc-1",
      documentName: "test.pdf",
      pageNumber: 3,
      chunkIndex: 0,
      chunkId: "chunk-1",
      contentPreview: "Some content here",
      score: 0.956,
    });
  });

  it("should truncate long content previews to 200 characters", () => {
    const longContent = "A".repeat(300);
    const chunks = [
      {
        id: "chunk-1",
        content: longContent,
        chunkIndex: 0,
        pageNumber: 1,
        documentId: "doc-1",
        document: { id: "doc-1", filename: "test.pdf" },
        score: 0.9,
      },
    ];

    const citations = chatService.formatCitations(chunks);

    expect(citations[0].contentPreview.length).toBeLessThanOrEqual(201); // 200 chars + 1 ellipsis
    expect(citations[0].contentPreview).toContain("…");
  });

  it("should handle null page numbers", () => {
    const chunks = [
      {
        id: "chunk-1",
        content: "Content",
        chunkIndex: 0,
        pageNumber: null,
        documentId: "doc-1",
        document: { id: "doc-1", filename: "test.pdf" },
        score: 0.8,
      },
    ];

    const citations = chatService.formatCitations(chunks);
    expect(citations[0].pageNumber).toBeNull();
  });

  it("should return empty array for no chunks", () => {
    const citations = chatService.formatCitations([]);
    expect(citations).toEqual([]);
  });

  it("should round scores to 3 decimal places", () => {
    const chunks = [
      {
        id: "chunk-1",
        content: "Content",
        chunkIndex: 0,
        pageNumber: 1,
        documentId: "doc-1",
        document: { id: "doc-1", filename: "test.pdf" },
        score: 0.95678,
      },
    ];

    const citations = chatService.formatCitations(chunks);
    expect(citations[0].score).toBe(0.957);
  });

  it("should deduplicate citations by chunkId", () => {
    const chunks = [
      {
        id: "chunk-1",
        content: "Duplicate content",
        chunkIndex: 0,
        pageNumber: 1,
        documentId: "doc-1",
        document: { id: "doc-1", filename: "test.pdf" },
        score: 0.95,
      },
      {
        id: "chunk-1",
        content: "Duplicate content",
        chunkIndex: 0,
        pageNumber: 1,
        documentId: "doc-1",
        document: { id: "doc-1", filename: "test.pdf" },
        score: 0.95,
      },
      {
        id: "chunk-2",
        content: "Unique content",
        chunkIndex: 1,
        pageNumber: 1,
        documentId: "doc-1",
        document: { id: "doc-1", filename: "test.pdf" },
        score: 0.85,
      },
    ];

    const citations = chatService.formatCitations(chunks);
    expect(citations).toHaveLength(2);
    expect(citations[0].chunkId).toBe("chunk-1");
    expect(citations[1].chunkId).toBe("chunk-2");
  });
});
