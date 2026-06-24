/**
 * RAG Retrieval Quality Evaluation Script
 *
 * Measures how well the retrieval pipeline surfaces relevant chunks
 * for a set of known test queries.
 *
 * Usage:
 *   npx tsx scripts/evaluate-rag.ts
 *   npx tsx scripts/evaluate-rag.ts --topK 5 --dataset ./scripts/eval-dataset.json
 *
 * Requires:
 *   - .env with PINECONE_API_KEY, PINECONE_INDEX, GEMINI_API_KEY, DATABASE_URL
 *   - At least one tenant with indexed documents in Pinecone
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX = process.env.PINECONE_INDEX || "docusense";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;

const args = process.argv.slice(2);
const topKFlag = args.indexOf("--topK");
const datasetFlag = args.indexOf("--dataset");

const TOP_K = topKFlag !== -1 ? parseInt(args[topKFlag + 1], 10) : 5;
const DATASET_PATH =
  datasetFlag !== -1
    ? args[datasetFlag + 1]
    : path.join(__dirname, "eval-dataset.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvalCase {
  query: string;
  expectedDocumentName?: string;
  expectedChunkKeywords: string[];
  tenantId: string;
  notes?: string;
}

interface EvalResult {
  query: string;
  retrievedDocs: string[];
  matchedExpectedDoc: boolean;
  keywordHits: number;
  keywordTotal: number;
  topScore: number;
  avgScore: number;
}

interface EvalMetrics {
  totalQueries: number;
  recallAtK: number;
  precisionAtK: number;
  accuracy: number;
  avgSimilarityScore: number;
  avgKeywordRecall: number;
  topK: number;
  timestamp: string;
  results: EvalResult[];
}

// ---------------------------------------------------------------------------
// Setup clients
// ---------------------------------------------------------------------------

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pinecone.Index(PINECONE_INDEX);

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function embedQuery(query: string): Promise<number[]> {
  const result = await embeddingModel.embedContent({
    content: { role: "user", parts: [{ text: query }] },
  });
  return result.embedding.values;
}

function keywordMatch(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

// ---------------------------------------------------------------------------
// Main evaluation
// ---------------------------------------------------------------------------

async function runEvaluation(): Promise<void> {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   DocuSense RAG Retrieval Evaluation     ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log();

  // Load dataset
  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`❌ Dataset not found: ${DATASET_PATH}`);
    console.error("   Create eval-dataset.json with your test cases.");
    process.exit(1);
  }

  const dataset: EvalCase[] = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  console.log(`📊 Loaded ${dataset.length} test cases (top-K = ${TOP_K})\n`);

  const results: EvalResult[] = [];
  let totalDocMatches = 0;
  let totalRelevantRetrieved = 0;
  let totalRetrieved = 0;
  let totalScores: number[] = [];

  for (let i = 0; i < dataset.length; i++) {
    const testCase = dataset[i];
    console.log(`[${i + 1}/${dataset.length}] Query: "${testCase.query}"`);

    try {
      // 1. Embed the query
      const queryVector = await embedQuery(testCase.query);

      // 2. Query Pinecone
      const queryResponse = await index.namespace(testCase.tenantId).query({
        vector: queryVector,
        topK: TOP_K,
        includeMetadata: true,
      });

      const matches = queryResponse.matches || [];
      const scores = matches.map((m) => m.score ?? 0);
      totalScores.push(...scores);

      // 3. Fetch chunk details from Postgres
      const chunkIds = matches.map((m) => m.id);
      const chunks = await db.documentChunk.findMany({
        where: { id: { in: chunkIds } },
        include: { document: { select: { filename: true } } },
      });

      const chunkMap = new Map(chunks.map((c) => [c.id, c]));
      const retrievedDocNames = [
        ...new Set(
          matches
            .map((m) => chunkMap.get(m.id)?.document.filename)
            .filter(Boolean),
        ),
      ] as string[];

      // 4. Check if expected document was retrieved
      const matchedExpectedDoc = testCase.expectedDocumentName
        ? retrievedDocNames.some((name) =>
            name
              .toLowerCase()
              .includes(testCase.expectedDocumentName!.toLowerCase()),
          )
        : true; // If no expected doc specified, skip this check

      if (matchedExpectedDoc) totalDocMatches++;

      // 5. Check keyword coverage across all retrieved chunks
      const allRetrievedText = matches
        .map((m) => {
          const chunk = chunkMap.get(m.id);
          return chunk?.content || (m.metadata?.content as string) || "";
        })
        .join(" ");

      const keywordHits = keywordMatch(
        allRetrievedText,
        testCase.expectedChunkKeywords,
      );
      const keywordTotal = testCase.expectedChunkKeywords.length;

      if (keywordHits > 0) totalRelevantRetrieved++;
      totalRetrieved += matches.length;

      const topScore = scores.length > 0 ? Math.max(...scores) : 0;
      const avgScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      const result: EvalResult = {
        query: testCase.query,
        retrievedDocs: retrievedDocNames,
        matchedExpectedDoc,
        keywordHits,
        keywordTotal,
        topScore: Math.round(topScore * 1000) / 1000,
        avgScore: Math.round(avgScore * 1000) / 1000,
      };
      results.push(result);

      const status = matchedExpectedDoc && keywordHits > 0 ? "✅" : "⚠️";
      console.log(
        `   ${status} Docs: [${retrievedDocNames.join(", ")}] | Keywords: ${keywordHits}/${keywordTotal} | Top Score: ${result.topScore}`,
      );
    } catch (error) {
      console.error(
        `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      results.push({
        query: testCase.query,
        retrievedDocs: [],
        matchedExpectedDoc: false,
        keywordHits: 0,
        keywordTotal: testCase.expectedChunkKeywords.length,
        topScore: 0,
        avgScore: 0,
      });
    }

    // Rate limiting: brief pause between queries
    await new Promise((r) => setTimeout(r, 500));
  }

  // ---------------------------------------------------------------------------
  // Compute aggregate metrics
  // ---------------------------------------------------------------------------

  const totalQueries = dataset.length;
  const avgSimilarityScore =
    totalScores.length > 0
      ? totalScores.reduce((a, b) => a + b, 0) / totalScores.length
      : 0;
  const avgKeywordRecall =
    results.reduce(
      (acc, r) =>
        acc + (r.keywordTotal > 0 ? r.keywordHits / r.keywordTotal : 0),
      0,
    ) / totalQueries;

  const metrics: EvalMetrics = {
    totalQueries,
    recallAtK: Math.round((totalDocMatches / totalQueries) * 1000) / 1000,
    precisionAtK:
      Math.round((totalRelevantRetrieved / Math.max(totalQueries, 1)) * 1000) /
      1000,
    accuracy:
      Math.round(
        (results.filter((r) => r.matchedExpectedDoc && r.keywordHits > 0)
          .length /
          totalQueries) *
          1000,
      ) / 1000,
    avgSimilarityScore: Math.round(avgSimilarityScore * 1000) / 1000,
    avgKeywordRecall: Math.round(avgKeywordRecall * 1000) / 1000,
    topK: TOP_K,
    timestamp: new Date().toISOString(),
    results,
  };

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║            Evaluation Results            ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(
    `║  Recall@${TOP_K}:           ${metrics.recallAtK.toFixed(3).padStart(10)}       ║`,
  );
  console.log(
    `║  Precision@${TOP_K}:        ${metrics.precisionAtK.toFixed(3).padStart(10)}       ║`,
  );
  console.log(
    `║  Accuracy:            ${metrics.accuracy.toFixed(3).padStart(10)}       ║`,
  );
  console.log(
    `║  Avg Similarity:      ${metrics.avgSimilarityScore.toFixed(3).padStart(10)}       ║`,
  );
  console.log(
    `║  Avg Keyword Recall:  ${metrics.avgKeywordRecall.toFixed(3).padStart(10)}       ║`,
  );
  console.log(
    `║  Total Queries:       ${String(metrics.totalQueries).padStart(10)}       ║`,
  );
  console.log("╚══════════════════════════════════════════╝");

  // Save results
  const outputPath = path.join(__dirname, "eval-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
  console.log(`\n💾 Results saved to ${outputPath}`);

  await db.$disconnect();
}

runEvaluation().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
