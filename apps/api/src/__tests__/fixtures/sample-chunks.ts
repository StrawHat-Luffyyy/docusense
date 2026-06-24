import type { RetrievedChunk } from "../../types/citation.js";

export const mockPineconeMatches = [
  {
    id: "chunk-1",
    score: 0.95,
    metadata: { documentId: "doc-1", chunkIndex: 0, content: "First chunk" },
  },
  {
    id: "chunk-2",
    score: 0.85,
    metadata: { documentId: "doc-1", chunkIndex: 1, content: "Second chunk" },
  },
  {
    id: "chunk-3",
    score: 0.75,
    metadata: { documentId: "doc-2", chunkIndex: 0, content: "Third chunk" },
  },
];

export const mockDbChunks = [
  {
    id: "chunk-1",
    content: "Full content of first chunk with more detail",
    chunkIndex: 0,
    pageNumber: 1,
    documentId: "doc-1",
    document: { id: "doc-1", filename: "guide.pdf" },
  },
  {
    id: "chunk-2",
    content: "Full content of second chunk with more detail",
    chunkIndex: 1,
    pageNumber: 2,
    documentId: "doc-1",
    document: { id: "doc-1", filename: "guide.pdf" },
  },
  {
    id: "chunk-3",
    content: "Full content of third chunk from another doc",
    chunkIndex: 0,
    pageNumber: 1,
    documentId: "doc-2",
    document: { id: "doc-2", filename: "policy.pdf" },
  },
];

export const mockRetrievedChunks: RetrievedChunk[] = [
  {
    id: "chunk-1",
    content: "Full content of first chunk with more detail",
    chunkIndex: 0,
    pageNumber: 1,
    documentId: "doc-1",
    document: { id: "doc-1", filename: "guide.pdf" },
    score: 0.95,
  },
  {
    id: "chunk-2",
    content: "Full content of second chunk with more detail",
    chunkIndex: 1,
    pageNumber: 2,
    documentId: "doc-1",
    document: { id: "doc-1", filename: "guide.pdf" },
    score: 0.85,
  },
  {
    id: "chunk-3",
    content: "Full content of third chunk from another doc",
    chunkIndex: 0,
    pageNumber: 1,
    documentId: "doc-2",
    document: { id: "doc-2", filename: "policy.pdf" },
    score: 0.75,
  },
];
