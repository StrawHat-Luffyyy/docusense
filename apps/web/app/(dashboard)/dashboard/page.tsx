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
  const [usageData, setUsageData] = useState({ queryCount: 0, limit: 100 });
  const [sharingDoc, setSharingDoc] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [docsRes, usageRes] = await Promise.all([
          fetch("/api/documents", { headers }),
          fetch("/api/usage", { headers }),
        ]);
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents);
        }
        if (usageRes.ok) {
          const usageJson = await usageRes.json();
          setUsageData({
            queryCount: usageJson.usage.queryCount,
            limit: usageJson.limit,
          });
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [getToken]);

  const usagePercentage = Math.min(
    (usageData.queryCount / usageData.limit) * 100,
    100,
  );

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
              Loading workspace...
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

        {/* USAGE PROGRESS BAR */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AI Queries Used
            </span>
            <span className="text-xs font-bold text-foreground">
              {usageData.queryCount} / {usageData.limit}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usagePercentage > 90
                  ? "bg-destructive"
                  : usagePercentage > 75
                    ? "bg-warning"
                    : "bg-primary"
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>
      </aside>

      {/* CHAT */}
      <div className="flex-1 bg-white relative">
        <ChatInterface
          onMessageSent={() => {
            // Instantly tick the counter up by 1 without needing a page reload
            setUsageData((prev) => ({
              ...prev,
              queryCount: prev.queryCount + 1,
            }));
          }}
        />
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
