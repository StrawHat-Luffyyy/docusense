"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2, ArrowUp } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface() {
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

      // Initialize the stream reader and decoder
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      // Read the chunk stream loop
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunkString = decoder.decode(value, { stream: true });
        // SSE formatting sends chunks split by double newlines (\n\n)
        const lines = chunkString.split("\n\n");
        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          const jsonString = line.replace("data: ", "").trim();
          // Check if the server signaled the end of transmission
          if (jsonString === "[DONE]") {
            break;
          }
          try {
            const parsed = JSON.parse(jsonString);
            if (parsed.text) {
              accumulatedResponse += parsed.text;

              // Update only the specific assistant message content in state
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
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Failed to get a response. Please check your backend connection.",
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
          {/* Hero */}
          <div className="flex-1 flex justify-center pt-20 px-6">
            <div className="w-full max-w-4xl">
              <div className="text-center">
                <h1 className="text-3xl font-semibold tracking-tight">
                  What would you like to know?
                </h1>

                <p className="mt-4 text-muted-foreground text-lg">
                  Search across documents, PDFs, reports, meeting notes,
                  contracts, and uploaded knowledge.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-10">
                {[
                  "Summarize uploaded documents",
                  "Find project deadlines",
                  "Explain this project",
                  "Show compliance requirements",
                  "List key risks",
                  "Generate executive summary",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="
                    rounded-2xl
                    border
                    border-border
                    p-4
                    text-left
                    transition-all
                    hover:bg-muted
                    hover:border-primary/40
                  "
                  >
                    <div className=" text-sm font-medium">{prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="pb-8 px-6">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div
                  className="
                  flex
                  items-center
                  gap-3
                  rounded-3xl
                  border
                  border-border
                  bg-card
                  px-4
                  py-3
                  shadow-sm
                "
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about your documents..."
                    disabled={isLoading}
                    className="
                    flex-1
                    bg-transparent
                    outline-none
                    text-base
                  "
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="
    h-9
    w-9
    flex
    items-center
    justify-center
    rounded-full
    bg-white
    text-black
    transition-all
    hover:scale-105
    disabled:opacity-40
    disabled:hover:scale-100
  "
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
          {/* Conversation */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-12">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-10">
                  <div className="text-sm text-muted-foreground mb-2">
                    {msg.role === "user" ? "You" : "DocuSense"}
                  </div>

                  <div
                    className={`
                    leading-7
                    whitespace-pre-wrap
                    text-base
                    ${
                      msg.role === "assistant"
                        ? "text-foreground"
                        : "text-foreground"
                    }
                  `}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sticky Composer */}
          <div className="border-t bg-background/90 backdrop-blur">
            <div className="max-w-4xl mx-auto p-6">
              <form onSubmit={handleSubmit}>
                <div
                  className="
                  flex
                  items-center
                  gap-3
                  rounded-3xl
                  border
                  border-border
                  bg-card
                  px-4
                  py-3
                "
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a follow-up..."
                    disabled={isLoading}
                    className="
                    flex-1
                    bg-transparent
                    outline-none
                    text-base
                  "
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="
                    rounded-xl
                    px-4
                    py-2
                    bg-primary
                    text-primary-foreground
                    font-medium
                    disabled:opacity-50
                  "
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
