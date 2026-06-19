"use client";

import React, { useState } from "react";

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
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      if (!response.ok) throw new Error("Failed to update sharing settings");

      const data = await response.json();
      setIsPublic(data.document.isPublic);
      setSharingToken(data.document.sharingToken);
    } catch (error) {
      console.error(error);
      alert("Failed to update share settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!sharingToken) return;

    const shareUrl = `${window.location.origin}/shared/${sharingToken}`;

    // Using execCommand for maximum compatibility in iframe/canvas environments
    const textArea = document.createElement("textarea");
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl text-foreground">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Share Document</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-6">
          <span className="font-medium text-slate-700">{filename}</span>
        </p>

        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg mb-6">
          <div>
            <p className="font-medium">Public Access</p>
            <p className="text-xs text-slate-500">
              Anyone with the link can view
            </p>
          </div>
          <button
            onClick={toggleShare}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        {isPublic && sharingToken && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 uppercase">
              Public Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/${sharingToken}`}
                className="flex-1 p-2 text-sm border rounded bg-slate-50 text-slate-600 outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-800 transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
