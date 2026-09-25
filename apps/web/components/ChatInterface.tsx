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
          bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
        title={`Source: ${citation.documentName}`}
      >
        <FileText className="w-3 h-3" />
        <span>[{index + 1}]</span>
        <span className="max-w-[120px] truncate">{citation.documentName}</span>
        {citation.pageNumber != null && (
          <span className="text-indigo-400/60">p.{citation.pageNumber}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-80 rounded-xl border border-white/10 bg-zinc-900 shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">
                {citation.documentName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {citation.pageNumber != null && (
                  <span className="text-xs text-zinc-400">
                    Page {citation.pageNumber}
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  Chunk #{citation.chunkIndex + 1}
                </span>
                <span className="text-xs text-indigo-400 font-medium">
                  {Math.round(citation.score * 100)}% match
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="rounded-lg bg-zinc-950/50 border border-white/5 p-3">
            <p className="text-xs text-zinc-400 leading-relaxed">
              {citation.contentPreview}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Clickable inline superscript citation badge.
 */
function InlineCitationBadge({
  citation,
  index,
}: {
  citation: Citation;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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
    <span
      className="relative inline-block"
      ref={popoverRef}
      style={{ verticalAlign: "super" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center text-[9px] font-bold h-3.5 min-w-3.5 px-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors mx-0.5 select-none cursor-pointer"
        style={{ transform: "translateY(-2px)" }}
        title={`Source: ${citation.documentName}`}
      >
        {index + 1}
      </button>

      {isOpen && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-80 rounded-xl border border-white/10 bg-zinc-900 shadow-xl p-4 block text-left font-normal normal-case not-italic leading-normal text-zinc-200">
          <span className="flex items-start justify-between mb-3">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-zinc-100 truncate">
                {citation.documentName}
              </span>
              <span className="flex items-center gap-2 mt-1">
                {citation.pageNumber != null && (
                  <span className="text-xs text-zinc-400">
                    Page {citation.pageNumber}
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  Chunk #{citation.chunkIndex + 1}
                </span>
                <span className="text-xs text-indigo-400 font-medium">
                  {Math.round(citation.score * 100)}% match
                </span>
              </span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
          <span className="block rounded-lg bg-zinc-950/50 border border-white/5 p-3">
            <span className="block text-xs text-zinc-400 leading-relaxed whitespace-normal">
              {citation.contentPreview}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * Helper to parse text and replace [1], [2], etc. with interactive inline badges.
 */
function renderMessageContent(content: string, citations?: Citation[]) {
  if (!content) return null;
  if (!citations || citations.length === 0) {
    return <span>{content}</span>;
  }

  const regex = /\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];
    const citNumber = parseInt(match[1], 10);

    if (matchIndex > lastIndex) {
      parts.push(content.substring(lastIndex, matchIndex));
    }

    const citationIndex = citNumber - 1;
    if (citationIndex >= 0 && citationIndex < citations.length) {
      parts.push(
        <InlineCitationBadge
          key={`inline-cit-${matchIndex}`}
          citation={citations[citationIndex]}
          index={citationIndex}
        />,
      );
    } else {
      parts.push(matchText);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <React.Fragment key={index}>{part}</React.Fragment>
        ) : (
          part
        ),
      )}
    </>
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
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
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
        <div className="mt-2 rounded-lg border border-white/5 bg-zinc-900/50 p-3 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Chunks
              </p>
              <p className="text-sm font-bold text-zinc-200 tabular-nums">
                {metadata.chunksRetrieved}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Confidence
              </p>
              <p className="text-sm font-bold text-zinc-200 tabular-nums">
                {Math.round(metadata.avgConfidence * 100)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Retrieval
              </p>
              <p className="text-sm font-bold text-zinc-200 tabular-nums">
                {metadata.retrievalTimeMs}ms
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Generation
              </p>
              <p className="text-sm font-bold text-zinc-200 tabular-nums">
                {metadata.generationTimeMs}ms
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">Embedding:</span>
              <span className="text-[10px] font-mono font-medium text-zinc-300 bg-white/5 px-1.5 py-0.5 rounded">
                {metadata.embeddingModel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">LLM:</span>
              <span className="text-[10px] font-mono font-medium text-zinc-300 bg-white/5 px-1.5 py-0.5 rounded">
                {metadata.llmModel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">Citations:</span>
              <span className="text-[10px] font-mono font-medium text-zinc-300 bg-white/5 px-1.5 py-0.5 rounded">
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
      let buffer = "";

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");

        // Save the last element (which might be a partial line) back to the buffer
        buffer = lines.pop() || "";

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
            console.error(
              "Error parsing SSE line:",
              err,
              "Line content:",
              line,
            );
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
    <div className="flex flex-col h-full bg-zinc-950 relative">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-zinc-950 to-zinc-950 pointer-events-none" />

          <div className="max-w-2xl w-full flex flex-col items-center text-center relative z-10 animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/10">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-4">
              How can I help you?
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mb-12">
              Ask questions about your uploaded documents, extract insights, or
              summarize complex topics.
            </p>

            <div className="w-full max-w-3xl">
              <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur opacity-30 group-focus-within:opacity-100 transition duration-500" />
                <div className="relative flex items-center bg-zinc-900 border border-white/10 rounded-3xl px-6 py-4 shadow-2xl">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about your documents..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none outline-none text-zinc-100 text-lg placeholder:text-zinc-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="ml-3 h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-400 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ArrowUp className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            </div>

            {documents.length === 0 && (
              <div className="mt-12 rounded-2xl border border-dashed border-white/10 p-6 text-center bg-white/5 max-w-lg mx-auto animate-in fade-in duration-300">
                <p className="text-sm text-zinc-400">
                  Upload a PDF document from the Knowledge Library to initialize
                  the vector database and start querying.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-12">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-8 flex gap-4">
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      msg.role === "user"
                        ? "bg-zinc-800 text-zinc-300"
                        : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                    }`}
                  >
                    {msg.role === "user" ? (
                      "U"
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      {msg.role === "user" ? "You" : "DocuSense AI"}
                    </div>
                    <div className="leading-relaxed whitespace-pre-wrap text-[15px] text-zinc-200">
                      {msg.content ? (
                        renderMessageContent(msg.content, msg.citations)
                      ) : (
                        <span className="inline-flex gap-1.5 items-center h-6">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce" />
                        </span>
                      )}
                    </div>

                    {/* Citation badges */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
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

          <div className="border-t border-white/5 bg-zinc-950/80 backdrop-blur-md pt-4 pb-6">
            <div className="max-w-4xl mx-auto px-6">
              <form onSubmit={handleSubmit} className="relative">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-lg">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a follow-up..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>
              <div className="mt-2 text-center">
                <p className="text-[10px] text-zinc-500 font-medium">
                  DocuSense AI can make mistakes. Verify important information
                  with the source citations.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
