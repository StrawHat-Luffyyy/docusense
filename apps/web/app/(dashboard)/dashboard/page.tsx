"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import ChatInterface from "@/components/ChatInterface";
import ShareModal from "@/components/ShareModal";

const STATUS_STYLES: Record<string, string> = {
  INDEXED: "bg-success/15 text-success",
  PROCESSING: "bg-warning/15 text-warning",
  PENDING: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/15 text-destructive",
  DELETED: "bg-muted text-muted-foreground",
};
type Document = {
  id: string;
  filename: string;
  status: string;
  isPublic: boolean;
  sharingToken: string | null;
};

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sharingDoc, setSharingDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/documents", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch documents");
        const data = await res.json();
        setDocuments(data.documents);
      } catch (error) {
        console.error("Failed to load knowledge library:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocuments();
  }, [getToken]);

  return (
    <main className="flex h-screen bg-background text-foreground">
      {/* SIDEBAR */}
      <aside className="w-85 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">Knowledge Library</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center mt-10">
              Loading documents...
            </p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center mt-10">
              No documents uploaded yet.
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="group rounded-xl border border-border bg-background/40 hover:bg-background/70 hover:border-primary/40 transition-colors p-3"
              >
                <p
                  className="text-sm font-medium truncate mb-2"
                  title={doc.filename}
                >
                  {doc.filename}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full ${
                      STATUS_STYLES[doc.status] ?? STATUS_STYLES.PENDING
                    }`}
                  >
                    {doc.status === "PROCESSING" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                    )}
                    {doc.status}
                  </span>

                  <button
                    onClick={() => setSharingDoc(doc)}
                    className="text-xs font-medium text-primary hover:text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Share
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* CHAT */}
      <div className="flex-1 relative">
        <ChatInterface />
      </div>

      {sharingDoc && (
        <ShareModal
          documentId={sharingDoc.id}
          filename={sharingDoc.filename}
          initialIsPublic={sharingDoc.isPublic}
          initialToken={sharingDoc.sharingToken}
          onClose={() => setSharingDoc(null)}
        />
      )}
    </main>
  );
}
