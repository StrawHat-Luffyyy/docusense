"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  FileText,
  Layers,
  HardDrive,
  Clock,
} from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import ShareModal from "@/components/ShareModal";
import { UploadModal } from "@/components/documents/UploadModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import ActivityFeed from "@/components/ActivityFeed";
import { apiClient } from "@/lib/api/client";

const STATUS_STYLES: Record<string, string> = {
  INDEXED: "bg-emerald-500/15 text-emerald-400",
  PROCESSING: "bg-amber-500/15 text-amber-400",
  PENDING: "bg-zinc-800 text-zinc-400",
  FAILED: "bg-red-500/15 text-red-400",
  DELETED: "bg-zinc-800 text-zinc-400",
};

type Document = {
  id: string;
  filename: string;
  status: string;
  isPublic: boolean;
  sharingToken: string | null;
  pageCount: number | null;
  chunkCount: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [sharingDoc, setSharingDoc] = useState<Document | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [docsRes, analyticsRes] = await Promise.all([
        apiClient.get("/api/documents"),
        apiClient.get("/api/analytics"),
      ]);

      setDocuments(docsRes.data.documents);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const hasActiveDocs = documents.some(
      (d) => d.status === "PENDING" || d.status === "PROCESSING",
    );
    if (!hasActiveDocs) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDashboardData]);

  const handleDelete = async () => {
    if (!docToDelete) return;
    const docId = docToDelete.id;
    setDeletingId(docId);
    setDocToDelete(null);
    try {
      await apiClient.delete(`/api/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const queryCount = analytics?.usage?.queryCount ?? 0;
  const queryLimit = analytics?.usage?.queryLimit ?? 100;
  const usagePercentage = Math.min((queryCount / queryLimit) * 100, 100);

  return (
    <>
      {/* Middle Column: Knowledge Library */}
      <aside className="w-80 shrink-0 border-r border-white/5 bg-zinc-950 flex flex-col">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-white">
              Knowledge Library
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {documents.length} document{documents.length !== 1 ? "s" : ""} ·{" "}
              {(analytics?.knowledgeBase?.totalChunks ?? 0).toLocaleString()}{" "}
              chunks
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors"
            title="Add documents"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-zinc-500 text-center mt-10">
              Loading workspace...
            </p>
          ) : documents.length === 0 ? (
            <div className="text-center mt-10 px-4">
              <p className="text-sm text-zinc-400 mb-3">
                No documents uploaded yet.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="group rounded-xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/80 hover:border-indigo-500/30 transition-all p-3"
              >
                <p
                  className="text-sm font-medium truncate mb-1.5 text-zinc-200"
                  title={doc.filename}
                >
                  {doc.filename}
                </p>

                {/* Enhanced metadata row */}
                <div className="flex items-center gap-2 mb-3 text-[10px] text-zinc-500 font-medium">
                  {doc.sizeBytes && (
                    <span className="flex items-center gap-0.5">
                      <HardDrive className="w-2.5 h-2.5" />
                      {formatBytes(doc.sizeBytes)}
                    </span>
                  )}
                  {doc.pageCount && (
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-2.5 h-2.5" />
                      {doc.pageCount}p
                    </span>
                  )}
                  {doc.chunkCount && (
                    <span className="flex items-center gap-0.5">
                      <Layers className="w-2.5 h-2.5" />
                      {doc.chunkCount} chunks
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 ml-auto">
                    <Clock className="w-2.5 h-2.5" />
                    {getRelativeTime(doc.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full ${
                      STATUS_STYLES[doc.status] ?? STATUS_STYLES.PENDING
                    }`}
                  >
                    {doc.status === "PROCESSING" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {doc.status}
                  </span>

                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSharingDoc(doc)}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => setDocToDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete document"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Activity Feed */}
        {analytics?.activityFeed && analytics.activityFeed.length > 0 && (
          <ActivityFeed items={analytics.activityFeed} />
        )}

        {/* Enhanced Usage Panel */}
        <div className="p-4 border-t border-white/5 bg-zinc-950/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              AI Queries
            </span>
            <span className="text-xs font-bold text-zinc-300 tabular-nums">
              {queryCount} / {queryLimit}
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1.5 mb-4">
            <div
              className={`h-1.5 rounded-full transition-all ${
                usagePercentage > 90
                  ? "bg-red-500"
                  : usagePercentage > 75
                    ? "bg-amber-500"
                    : "bg-indigo-500"
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-200 tabular-nums">
                {analytics?.knowledgeBase?.statusBreakdown?.INDEXED ?? 0}
              </p>
              <p className="text-[10px] text-zinc-500">Indexed</p>
            </div>
            <div className="text-center border-l border-white/5">
              <p className="text-sm font-bold text-zinc-200 tabular-nums">
                {(analytics?.knowledgeBase?.totalChunks ?? 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500">Chunks</p>
            </div>
            <div className="text-center border-l border-white/5">
              <p className="text-sm font-bold text-zinc-200 tabular-nums">
                {formatBytes(analytics?.knowledgeBase?.storageUsedBytes ?? 0)}
              </p>
              <p className="text-[10px] text-zinc-500">Storage</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 relative">
        <ChatInterface
          documents={documents}
          onMessageSent={fetchDashboardData}
          analytics={analytics}
        />
      </div>

      {sharingDoc && (
        <ShareModal
          documentId={sharingDoc.id}
          filename={sharingDoc.filename}
          initialIsPublic={sharingDoc.isPublic}
          initialToken={sharingDoc.sharingToken}
          onClose={() => setSharingDoc(null)}
          onShareChange={(isPublic, token) => {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === sharingDoc.id
                  ? { ...d, isPublic, sharingToken: token }
                  : d,
              ),
            );
          }}
        />
      )}

      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={fetchDashboardData}
        />
      )}
      {docToDelete && (
        <ConfirmDialog
          title="Delete document?"
          description={`"${docToDelete.filename}" will be permanently removed. This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDocToDelete(null)}
        />
      )}
    </>
  );
}
