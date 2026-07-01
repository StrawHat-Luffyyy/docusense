"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Loader2,
  ArrowUp,
  FileText,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Shield,
  BarChart3,
  Layers,
  Brain,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import KnowledgeBasePanel from "@/components/KnowledgeBasePanel";

interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  chunkIndex: number;
  chunkId: string;
  contentPreview: string;
  score: number;
}

interface RetrievalMetadata {
  retrievalTimeMs: number;
  generationTimeMs: number;
  chunksRetrieved: number;
  avgConfidence: number;
  citationCount: number;
  embeddingModel: string;
  llmModel: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  metadata?: RetrievalMetadata;
}

interface DocSummary {
  id: string;
  filename: string;
  status: string;
}

interface AnalyticsData {
  knowledgeBase: {
    totalDocuments: number;
    totalChunks: number;
    totalPages: number;
    storageUsedBytes: number;
    embeddingsGenerated: number;
    statusBreakdown: Record<string, number>;
  };
  infrastructure: {
    vectorStore: string;
    embeddingModel: string;
    llmProvider: string;
    llmModel: string;
    chunkingStrategy: string;
    vectorDimensions: number;
  };
  usage: {
    queryCount: number;
    documentCount: number;
    queryLimit: number;
  };
  activityFeed: Array<{
    id: string;
    filename: string;
    action: string;
    status: string;
    timestamp: string;
    sizeBytes: number;
  }>;
}

interface ChatInterfaceProps {
  onMessageSent?: () => void;
  documents?: DocSummary[];
  analytics?: AnalyticsData | null;
}

/**
 * Citation badge rendered below an assistant message.
 * Clicking opens a popover with source details.
 */
function CitationBadge({
  citation,
  index,
}: {
  citation: Citation;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
        title={`Source: ${citation.documentName}`}
      >
        <FileText className="w-3 h-3" />
        <span>[{index + 1}]</span>
        <span className="max-w-[120px] truncate">{citation.documentName}</span>
        {citation.pageNumber != null && (
          <span className="text-primary/60">p.{citation.pageNumber}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-80 rounded-xl border border-border bg-card shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {citation.documentName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {citation.pageNumber != null && (
                  <span className="text-xs text-muted-foreground">
                    Page {citation.pageNumber}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Chunk #{citation.chunkIndex + 1}
                </span>
                <span className="text-xs text-primary/70 font-medium">
                  {Math.round(citation.score * 100)}% match
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {citation.contentPreview}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Expandable retrieval inspector showing per-response metadata.
 */
function RetrievalInspector({ metadata }: { metadata: RetrievalMetadata }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <BarChart3 className="w-3 h-3" />
        Retrieval Inspector
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-2 rounded-lg border border-border bg-card/50 p-3 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Chunks
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {metadata.chunksRetrieved}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Confidence
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {Math.round(metadata.avgConfidence * 100)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Retrieval
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {metadata.retrievalTimeMs}ms
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Generation
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {metadata.generationTimeMs}ms
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                Embedding:
              </span>
              <span className="text-[10px] font-mono font-medium text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {metadata.embeddingModel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">LLM:</span>
              <span className="text-[10px] font-mono font-medium text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {metadata.llmModel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                Citations:
              </span>
              <span className="text-[10px] font-mono font-medium text-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {metadata.citationCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CAPABILITIES = [
  {
    icon: Search,
    title: "Semantic Search",
    desc: "Vector-based retrieval using cosine similarity across indexed document chunks.",
  },
  {
    icon: Shield,
    title: "Grounded Answers",
    desc: "Responses generated exclusively from retrieved context — no hallucination.",
  },
  {
    icon: FileText,
    title: "Source Citations",
    desc: "Every answer references specific documents, pages, and chunk IDs.",
  },
  {
    icon: BarChart3,
    title: "Confidence Scoring",
    desc: "Similarity scores and retrieval metrics exposed per response.",
  },
  {
    icon: Layers,
    title: "Multi-document Reasoning",
    desc: "Cross-reference multiple indexed documents in a single query.",
  },
  {
    icon: Brain,
    title: "RAG Pipeline",
    desc: "End-to-end retrieval-augmented generation with semantic chunking.",
  },
];

export default function ChatInterface({
  onMessageSent,
  documents = [],
  analytics = null,
}: ChatInterfaceProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessageText = input.trim();
    setInput("");
    setIsLoading(true);

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: userMessageText },
    ]);

    try {
      const token = await getToken();
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessageText }),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      if (!response.ok || !response.body) {
        throw new Error("Failed to start chat stream");
      }
      onMessageSent?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunkString = decoder.decode(value, { stream: true });
        const lines = chunkString.split("\n\n");
        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          const jsonString = line.replace("data: ", "").trim();
          if (jsonString === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonString);

            // Handle citation event
            if (parsed.citations) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, citations: parsed.citations }
                    : msg,
                ),
              );
              continue;
            }

            // Handle metadata event
            if (parsed.metadata) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, metadata: parsed.metadata }
                    : msg,
                ),
              );
              continue;
            }

            if (parsed.text) {
              accumulatedResponse += parsed.text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedResponse }
                    : msg,
                ),
              );
            }
          } catch (err) {
            console.error("Error parsing SSE line:", err);
          }
        }
      }
    } catch (error: unknown) {
      console.error("Streaming error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to get a response. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {messages.length === 0 ? (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
              {/* Enterprise Knowledge Assistant Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-5">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Enterprise Knowledge Assistant
                </h1>
                <p className="mt-2 text-muted-foreground text-sm max-w-lg mx-auto">
                  Search your indexed documents using semantic retrieval.
                  Responses are grounded using retrieved document chunks and
                  include source citations.
                </p>
              </div>

              {/* Capabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-8">
                {CAPABILITIES.map((cap) => (
                  <div
                    key={cap.title}
                    className="rounded-xl border border-border bg-card/30 p-5 hover:border-primary/20 hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <cap.icon className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {cap.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Knowledge Base Panel (Analytics + Pipeline) */}
              {analytics && (
                <KnowledgeBasePanel
                  knowledgeBase={analytics.knowledgeBase}
                  infrastructure={analytics.infrastructure}
                />
              )}

              {documents.length === 0 && (
                <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center bg-card/10 max-w-2xl mx-auto animate-in fade-in duration-300">
                  <p className="text-sm text-muted-foreground">
                    Upload a PDF document from the sidebar to initialize the
                    vector database.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pb-8 px-6">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 shadow-sm focus-within:border-primary/50 transition-colors">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about your documents..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent outline-none text-base"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-12">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-8 flex gap-3">
                  <div
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      msg.role === "user"
                        ? "bg-muted text-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {msg.role === "user" ? (
                      "Y"
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="text-sm font-medium text-muted-foreground mb-1.5">
                      {msg.role === "user" ? "You" : "DocuSense"}
                    </div>
                    <div className="leading-7 whitespace-pre-wrap text-base text-foreground">
                      {msg.content || (
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                        </span>
                      )}
                    </div>

                    {/* Citation badges */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.citations.map((citation, i) => (
                          <CitationBadge
                            key={citation.chunkId}
                            citation={citation}
                            index={i}
                          />
                        ))}
                      </div>
                    )}

                    {/* Retrieval Inspector */}
                    {msg.metadata && (
                      <RetrievalInspector metadata={msg.metadata} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-border bg-background/90 backdrop-blur">
            <div className="max-w-4xl mx-auto p-6">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 focus-within:border-primary/50 transition-colors">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a follow-up..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent outline-none text-base"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="rounded-xl px-4 py-2 bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
                  >
                    {isLoading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
