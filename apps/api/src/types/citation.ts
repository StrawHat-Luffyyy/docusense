/**
 * Represents a single source citation from a retrieved document chunk.
 * Returned alongside every AI-generated answer for traceability.
 */
export interface Citation {
  /** Internal document UUID */
  documentId: string;
  /** Original filename of the source document */
  documentName: string;
  /** Page number in the source PDF (null if unavailable) */
  pageNumber: number | null;
  /** Sequential chunk index within the document */
  chunkIndex: number;
  /** UUID of the DocumentChunk row */
  chunkId: string;
  /** First ~200 chars of the chunk for preview */
  contentPreview: string;
  /** Cosine similarity score from Pinecone (0–1) */
  score: number;
}

/**
 * Shape of a chunk returned from retrieval, enriched with
 * document metadata and similarity score.
 */
export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  documentId: string;
  document: {
    id: string;
    filename: string;
  };
  /** Similarity score from the vector search */
  score: number;
}

/**
 * Result of page-aware text chunking.
 */
export interface ChunkWithPage {
  content: string;
  pageNumber: number;
}
