"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Layers,
  HardDrive,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  Building,
  Globe,
} from "lucide-react";

interface SharedDoc {
  filename: string;
  status: string;
  pageCount: number;
  chunkCount: number;
  sharedAt: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  indexedAt: string | null;
  workspaceName: string;
}

const STATUS_STYLES: Record<string, string> = {
  INDEXED: "bg-success/15 text-success",
  PROCESSING: "bg-warning/15 text-warning",
  PENDING: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/15 text-destructive",
  DELETED: "bg-muted text-muted-foreground",
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetadataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export default function SharedDocumentPage() {
  const params = useParams();
  const token = params.token as string;

  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchDocument = async () => {
      try {
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const response = await fetch(
          `${apiBaseUrl}/api/public/documents/${token}`,
          {
            cache: "no-store",
          },
        );
        if (!response.ok) {
          throw new Error("Document not found or access revoked.");
        }
        const data = await response.json();
        setDoc(data.document);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load document");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">
          Loading secure document...
        </p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="bg-card p-8 rounded-xl border border-destructive/30 shadow-sm max-w-md w-full text-center">
          <div className="w-16 h-16 bg-destructive/15 text-destructive rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Access Denied
          </h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const mimeLabel =
    doc.mimeType === "application/pdf" ? "PDF Document" : doc.mimeType;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-card overflow-hidden shadow-sm rounded-xl border border-border mb-4">
          <div className="px-6 py-5 border-b border-border bg-background">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {doc.filename}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shared securely via DocuSense
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full ${
                  STATUS_STYLES[doc.status] ?? STATUS_STYLES.PENDING
                }`}
              >
                {doc.status === "INDEXED" && (
                  <CheckCircle className="w-3 h-3" />
                )}
                {doc.status}
              </span>
            </div>
          </div>
        </div>

        {/* Document Details */}
        <div className="bg-card rounded-xl border border-border shadow-sm mb-4">
          <div className="px-6 py-3 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Document Details
            </h2>
          </div>
          <div className="px-6">
            <MetadataRow
              icon={FileText}
              label="Document Type"
              value={mimeLabel}
            />
            <MetadataRow
              icon={HardDrive}
              label="File Size"
              value={formatBytes(doc.sizeBytes)}
            />
            <MetadataRow
              icon={FileText}
              label="Pages"
              value={doc.pageCount ? String(doc.pageCount) : "—"}
            />
            <MetadataRow
              icon={Layers}
              label="Knowledge Chunks"
              value={doc.chunkCount ? String(doc.chunkCount) : "0"}
            />
          </div>
        </div>

        {/* Timestamps & Context */}
        <div className="bg-card rounded-xl border border-border shadow-sm mb-4">
          <div className="px-6 py-3 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Timeline
            </h2>
          </div>
          <div className="px-6">
            <MetadataRow
              icon={Calendar}
              label="Created"
              value={formatDate(doc.createdAt)}
            />
            <MetadataRow
              icon={Clock}
              label="Last Updated"
              value={formatDate(doc.updatedAt)}
            />
            <MetadataRow
              icon={Globe}
              label="Shared On"
              value={formatDate(doc.sharedAt)}
            />
            {doc.indexedAt && (
              <MetadataRow
                icon={CheckCircle}
                label="Indexed At"
                value={formatDate(doc.indexedAt)}
              />
            )}
          </div>
        </div>

        {/* Workspace Info */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-3 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Source
            </h2>
          </div>
          <div className="px-6">
            <MetadataRow
              icon={Building}
              label="Workspace"
              value={doc.workspaceName}
            />
            <MetadataRow
              icon={Shield}
              label="Index Status"
              value={
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    doc.status === "INDEXED"
                      ? "text-success"
                      : "text-muted-foreground"
                  }`}
                >
                  {doc.status === "INDEXED" && (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  {doc.status === "INDEXED" ? "Fully Indexed" : doc.status}
                </span>
              }
            />
          </div>
        </div>

        {/* Footer Branding */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-foreground">DocuSense</span> ·
            AI Document Intelligence Platform
          </p>
        </div>
      </div>
    </div>
  );
}
