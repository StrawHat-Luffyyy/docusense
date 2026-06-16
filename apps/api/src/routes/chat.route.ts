import express, { Request, Response } from "express";
import {
  requireAuth,
  injectTenantContext,
} from "../middleware/auth.middleware.js";
import { chatService } from "../services/chat.service.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export const chatRouter = express.Router();

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

      const contextChunks = await chatService.retrieveContext(
        tenantId,
        message,
        3,
      );

      let contextText = "";
      if (contextChunks.length > 0) {
        contextText = contextChunks
          .map((c) => `[Source: ${c.document.filename}]\n${c.content}`)
          .join("\n\n---\n\n");
      } else {
        contextText = "No relevant documents found in the database.";
      }
      const systemPrompt = `
        You are a helpful AI assistant for a private organization.
        Answer the user's question using ONLY the provided context below.
        If the context does not contain the answer, say "I cannot answer this based on the provided documents."
        Do not use your general outside knowledge.
        
        CONTEXT:
        ${contextText}
        
        USER QUESTION:
        ${message}
      `;
      // Configure Express for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      logger.info(`Streaming LLM response for query : "${message}" `);

      const result = await model.generateContentStream(systemPrompt);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      logger.error({ err: error }, "Chat Stream Error");
      // If headers are already sent, we can't send a 500 status code, we just close the stream
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat message" });
      } else {
        res.write(
          `data: ${JSON.stringify({ error: "An error occurred during generation." })}\n\n`,
        );
        res.end();
      }
    }
  },
);
