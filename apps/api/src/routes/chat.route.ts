import express, { Request, Response } from "express";
import {
  requireAuth,
  injectTenantContext,
} from "../middleware/auth.middleware.js";
import { chatService } from "../services/chat.service.js";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { usageService } from "../services/usage.service.js";
import type { RetrievedChunk } from "../types/citation.js";

export const chatRouter = express.Router();

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Retries up to `maxAttempts` times with exponential backoff, only on 503s
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const is503 =
        (err instanceof GoogleGenerativeAIFetchError && err.status === 503) ||
        (err instanceof Error && err.message.includes("503"));

      if (is503 && attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        logger.warn(
          `Gemini 503 on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err; // non-503 or exhausted retries
    }
  }
  throw lastError;
}

/**
 * Builds a numbered context string with source references that the
 * LLM can cite in its answer using [1], [2], etc.
 */
function buildContextWithSources(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant documents found in the database.";
  }

  return chunks
    .map((chunk, index) => {
      const pageInfo =
        chunk.pageNumber != null ? `, Page ${chunk.pageNumber}` : "";
      return `[${index + 1}] Source: ${chunk.document.filename}${pageInfo}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

chatRouter.post(
  "/",
  requireAuth,
  injectTenantContext,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { message } = req.body;
      const tenantId = req.tenantId!;

      if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
      }

      const isAllowed = await usageService.checkAndIncrementQuery(tenantId);
      if (!isAllowed) {
        res.status(429).json({
          error:
            "Monthly query limit reached. Please upgrade your workspace plan to continue using the AI.",
        });
        return;
      }

      const retrievalStart = Date.now();
      const contextChunks = await chatService.retrieveContext(
        tenantId,
        message,
        3,
      );
      const retrievalTimeMs = Date.now() - retrievalStart;

      const contextText = buildContextWithSources(contextChunks);

      const systemPrompt = `
        You are a helpful AI assistant for a private organization.
        Answer the user's question using ONLY the provided context below.
        If the context does not contain the answer, say "I cannot answer this based on the provided documents."
        Do not use your general outside knowledge.

        When you use information from a source, cite it using the source number in brackets, e.g. [1], [2].
        
        CONTEXT:
        ${contextText}
        
        USER QUESTION:
        ${message}
      `;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      logger.info(`Streaming LLM response for query: "${message}"`);

      const generationStart = Date.now();
      // Wrap the Gemini call in retry logic
      const result = await withRetry(() =>
        model.generateContentStream(systemPrompt),
      );

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
      const generationTimeMs = Date.now() - generationStart;

      // Send citations as a final SSE event before closing the stream
      const citations = chatService.formatCitations(contextChunks);
      res.write(`data: ${JSON.stringify({ citations })}\n\n`);

      // Send retrieval metadata for the Retrieval Inspector
      const avgConfidence =
        contextChunks.length > 0
          ? Math.round(
              (contextChunks.reduce((sum, c) => sum + c.score, 0) /
                contextChunks.length) *
                1000,
            ) / 1000
          : 0;

      res.write(
        `data: ${JSON.stringify({
          metadata: {
            retrievalTimeMs,
            generationTimeMs,
            chunksRetrieved: contextChunks.length,
            avgConfidence,
            citationCount: citations.length,
            embeddingModel: "gemini-embedding-001",
            llmModel: "gemini-2.5-flash",
          },
        })}\n\n`,
      );

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      logger.error({ err: error }, "Chat Stream Error");

      const is503 =
        (error instanceof GoogleGenerativeAIFetchError &&
          error.status === 503) ||
        (error instanceof Error && error.message.includes("503"));

      if (!res.headersSent) {
        if (is503) {
          res.status(503).json({
            error:
              "The AI service is temporarily overloaded. Please try again in a moment.",
          });
        } else {
          res.status(500).json({ error: "Failed to process chat message" });
        }
      } else {
        res.write(
          `data: ${JSON.stringify({
            error: is503
              ? "AI service overloaded. Please retry."
              : "An error occurred during generation.",
          })}\n\n`,
        );
        res.end();
      }
    }
  },
);
