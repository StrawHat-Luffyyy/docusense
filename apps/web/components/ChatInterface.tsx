"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2, ArrowUp, FileText, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export default function ChatInterface({
  onMessageSent,
  documents = [],
}: ChatInterfaceProps) {
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

  const indexedDocs = documents.filter((d) => d.status === "INDEXED");

  const suggestions: string[] =
    indexedDocs.length === 0
      ? []
      : indexedDocs.length === 1
        ? [
            `Summarize ${indexedDocs[0].filename}`,
            `What are the key points in ${indexedDocs[0].filename}?`,
          ]
        : [
            "Summarize all my documents",
            `What's in ${indexedDocs[0].filename}?`,
            `Compare ${indexedDocs[0].filename} and ${indexedDocs[1].filename}`,
            "What topics come up most across my documents?",
          ];

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (error: any) {
      console.error("Streaming error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error?.message || "Failed to get a response. Please try again.",
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
                  Ask anything about the documents you've uploaded.
                </p>
              </div>

              {suggestions.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 mt-10">
                  {suggestions.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="rounded-2xl border border-border p-4 text-left transition-all hover:bg-muted hover:border-primary/40 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-sm font-medium leading-snug">
                          {prompt}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Upload a document from the sidebar to start asking questions
                    about it.
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
