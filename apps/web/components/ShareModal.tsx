"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { X, Globe, Link } from "lucide-react";

interface ShareModalProps {
  documentId: string;
  filename: string;
  initialIsPublic: boolean;
  initialToken: string | null;
  onClose: () => void;
}

export default function ShareModal({
  documentId,
  filename,
  initialIsPublic,
  initialToken,
  onClose,
}: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [sharingToken, setSharingToken] = useState(initialToken);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleShare = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.patch(
        `/api/documents/${documentId}/share`,
        {
          isPublic: !isPublic,
        },
      );

      const { document } = response.data;
      setIsPublic(document.isPublic);
      setSharingToken(document.sharingToken);

      toast.success(
        document.isPublic
          ? "Document is now publicly accessible."
          : "Public access has been revoked.",
      );
    } catch (error) {
      console.error("Failed to update sharing settings:", error);
      toast.error("Failed to update share settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!sharingToken) return;

    const shareUrl = `${window.location.origin}/shared/${sharingToken}`;

    const textArea = document.createElement("textarea");
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed", err);
      toast.error("Failed to copy link");
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl text-foreground animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Share Document
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-1 truncate font-mono bg-muted/30 px-2.5 py-1.5 rounded border border-border/50">
          {filename}
        </p>

        <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl mb-6 mt-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Public Access
            </p>
            <p className="text-xs text-muted-foreground">
              Anyone with the link can view this document
            </p>
          </div>
          <button
            onClick={toggleShare}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${isPublic ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span
              className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${isPublic ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        {isPublic && sharingToken && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Link className="w-3 h-3" />
              Public Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/${sharingToken}`}
                className="flex-1 p-2 text-sm border border-border rounded-lg bg-muted/10 text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition active:scale-95 shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-muted/80 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
