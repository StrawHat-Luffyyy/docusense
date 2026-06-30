"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Loader2,
  ArrowUp,
  FileText,
  Sparkles,
  X,
  Database,
  Search,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs"; // 1. Import Clerk auth hook

interface Citation {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  chunkIndex: number;
  chunkId: string;
  contentPreview: string;
  score: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface DocSummary {
  id: string;
  filename: string;
  status: string;
}

interface ChatInterfaceProps {
  onMessageSent?: () => void;
  documents?: DocSummary[];
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

export default function ChatInterface({
  onMessageSent,
  documents = [],
}: ChatInterfaceProps) {
  const { getToken } = useAuth(); // 2. Initialize the hook
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
      // 3. Grab the token and build the correct URL
      const token = await getToken();
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      // 4. Point the fetch to the backend and attach the token
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
          <div className="flex-1 flex justify-center pt-20 px-6">
            <div className="w-full max-w-4xl">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-5">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">
                  What would you like to know?
                </h1>
                <p className="mt-3 text-muted-foreground text-lg">
                  Ask anything about the documents you&#39;ve uploaded.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 max-w-2xl mx-auto animate-in fade-in duration-500">
                <div className="rounded-2xl border border-border bg-card/40 p-5 text-left transition-colors hover:border-primary/20">
                  <div className="flex items-center gap-3 mb-2.5 text-primary">
                    <Database className="w-4 h-4" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Semantic Vector Indexing
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Documents are automatically parsed, chunked, and embedded
                    into a vector space. Search queries retrieve context chunks
                    based on cosine similarity confidence scores.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card/40 p-5 text-left transition-colors hover:border-primary/20">
                  <div className="flex items-center gap-3 mb-2.5 text-primary">
                    <Search className="w-4 h-4" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Grounded Citations
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI responses are strictly grounded in retrieved chunks.
                    Every answer includes interactive badges referencing
                    specific source documents and page numbers.
                  </p>
                </div>
              </div>

              {documents.length === 0 && (
                <div className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center bg-card/10 max-w-2xl mx-auto animate-in fade-in duration-300">
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
