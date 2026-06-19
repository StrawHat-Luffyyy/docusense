"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SharedDoc {
  filename: string;
  status: string;
  pageCount: number;
  chunkCount: number;
  sharedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  INDEXED: "bg-success/15 text-success",
  PROCESSING: "bg-warning/15 text-warning",
  PENDING: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/15 text-destructive",
  DELETED: "bg-muted text-muted-foreground",
};

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
        const response = await fetch(`/api/public/documents/${token}`, {
          cache: "no-store",
        });
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

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card overflow-hidden shadow-sm sm:rounded-xl border border-border">
          <div className="px-4 py-5 sm:px-6 border-b border-border bg-background">
            <h3 className="text-lg leading-6 font-medium text-foreground">
              Public Document Profile
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Shared securely via DocuSense
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">
                  File Name
                </dt>
                <dd className="mt-1 text-lg text-foreground font-semibold">
                  {doc.filename}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1 text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_STYLES[doc.status] ?? STATUS_STYLES.PENDING
                    }`}
                  >
                    {doc.status}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Shared On
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {new Date(doc.sharedAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Pages
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {doc.pageCount || "Unknown"}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Knowledge Chunks
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {doc.chunkCount || 0}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
