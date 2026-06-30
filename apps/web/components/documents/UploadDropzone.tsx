"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api/client";
import axios from "axios";
import {
  UploadCloud,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Cpu,
  Layers,
  Brain,
  Database,
} from "lucide-react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

const PIPELINE_STAGES = [
  { icon: UploadCloud, label: "Uploading", key: "uploading" },
  { icon: FileText, label: "Extracting Text", key: "extracting" },
  { icon: Layers, label: "Chunking", key: "chunking" },
  { icon: Brain, label: "Generating Embeddings", key: "embedding" },
  { icon: Database, label: "Indexing", key: "indexing" },
  { icon: CheckCircle, label: "Complete", key: "complete" },
];

export function UploadDropzone({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [pipelineStage, setPipelineStage] = useState(0);
  const { getToken, orgId } = useAuth();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadState("uploading");
      setProgress(0);
      setPipelineStage(0);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        if (!orgId) {
          throw new Error(
            "No active organization. Please select an organization to upload documents.",
          );
        }

        const initResponse = await apiClient.post(
          "/api/documents/upload/init",
          {
            filename: file.name,
            contentType: file.type,
            mimeType: file.type,
            sizeBytes: file.size,
            organizationId: orgId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-organization-id": orgId,
            },
          },
        );
        const { uploadUrl, documentId } = initResponse.data;
        await axios.put(uploadUrl, file, {
          headers: {
            "Content-Type": file.type,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setProgress(percentCompleted);
            }
          },
        });

        // File uploaded, now trigger processing
        setPipelineStage(1);
        setUploadState("processing");

        await apiClient.post(
          `/api/documents/${documentId}/process`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        // Simulate pipeline progression for visual feedback
        const stages = [2, 3, 4, 5];
        for (const stage of stages) {
          await new Promise((r) => setTimeout(r, 600));
          setPipelineStage(stage);
        }

        setUploadState("success");
        toast.success("Document uploaded and queued for processing!");
        onUploadComplete?.();
      } catch (error: unknown) {
        console.error("Upload failed:", error);
        setUploadState("error");

        let errorMessage = "Failed to upload document";

        if (axios.isAxiosError(error)) {
          const apiError = error.response?.data?.error;

          if (typeof apiError === "string") {
            errorMessage = apiError;
          } else if (apiError?.message) {
            errorMessage = apiError.message;
          } else {
            errorMessage = error.message;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        toast.error(errorMessage);
      }
    },
    [getToken, orgId, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  return (
    <div
      {...getRootProps()}
      className={`
      relative
      flex
      flex-col
      items-center
      justify-center
      w-full
      min-h-90
      rounded-3xl
      border
      border-zinc-800
      bg-zinc-950
      transition-all
      cursor-pointer

      ${isDragActive ? "border-zinc-500 bg-zinc-900" : "hover:border-zinc-700"}

      ${uploadState === "uploading" || uploadState === "processing" ? "pointer-events-none" : ""}
    `}
    >
      <input {...getInputProps()} />

      {uploadState === "idle" && (
        <div className="flex flex-col items-center text-center px-8">
          <div
            className="
            flex
            items-center
            justify-center
            w-16
            h-16
            rounded-2xl
            bg-zinc-900
            border
            border-zinc-800
            mb-6
          "
          >
            <UploadCloud className="w-7 h-7 text-zinc-400" />
          </div>

          <h3 className="text-xl font-semibold">Drop documents here</h3>

          <p className="mt-3 text-sm text-zinc-400 max-w-md">
            Upload PDF files to your organizations knowledge base.
          </p>

          <div className="mt-6">
            <button
              type="button"
              className="
              rounded-xl
              border
              border-zinc-700
              px-4
              py-2
              text-sm
              hover:bg-zinc-900
            "
            >
              Browse files
            </button>
          </div>

          {/* Supported formats & processing info */}
          <div className="mt-6 space-y-3 w-full max-w-sm">
            <div className="flex items-center justify-between text-xs text-zinc-500 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              <span>Supported Formats</span>
              <span className="font-mono font-medium text-zinc-400">PDF</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
              <span>Maximum File Size</span>
              <span className="font-mono font-medium text-zinc-400">50 MB</span>
            </div>
          </div>

          <div className="mt-4 text-left w-full max-w-sm">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-2 px-1">
              Automatic Processing
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Text Extraction",
                "Semantic Chunking",
                "Embedding Generation",
                "Vector Indexing",
              ].map((step) => (
                <span
                  key={step}
                  className="text-[10px] text-zinc-500 px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/50"
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {(uploadState === "uploading" || uploadState === "processing") && (
        <div className="w-full max-w-md px-8">
          <div className="flex flex-col items-center mb-6">
            <Cpu className="w-8 h-8 text-zinc-400 mb-4 animate-pulse" />
            <h3 className="font-medium">
              {uploadState === "uploading"
                ? "Uploading document..."
                : "Processing pipeline..."}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              {uploadState === "uploading"
                ? "Securely transferring file"
                : "Running RAG ingestion pipeline"}
            </p>
          </div>

          {/* Pipeline stages */}
          <div className="space-y-1">
            {PIPELINE_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = i === pipelineStage;
              const isComplete = i < pipelineStage;
              const isPending = i > pipelineStage;

              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-zinc-800/50 border border-zinc-700"
                      : isComplete
                        ? "opacity-60"
                        : "opacity-30"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-zinc-300 animate-spin shrink-0" />
                  ) : (
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isPending ? "text-zinc-600" : "text-zinc-400"}`}
                    />
                  )}
                  <span
                    className={`text-sm ${isActive ? "text-zinc-200 font-medium" : "text-zinc-500"}`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {uploadState === "uploading" && (
            <div className="w-full mt-4">
              <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-zinc-200 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-sm text-zinc-400">
                {progress}%
              </p>
            </div>
          )}
        </div>
      )}

      {uploadState === "success" && (
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />

          <h3 className="font-medium">Document uploaded</h3>

          <p className="text-sm text-zinc-500 mt-2">
            RAG pipeline processing has started.
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setUploadState("idle");
              setPipelineStage(0);
            }}
            className="
            mt-6
            text-sm
            text-zinc-400
            hover:text-zinc-200
          "
          >
            Upload another file
          </button>
        </div>
      )}

      {uploadState === "error" && (
        <div className="flex flex-col items-center text-center">
          <XCircle className="w-12 h-12 text-red-500 mb-4" />

          <h3 className="font-medium">Upload failed</h3>

          <p className="text-sm text-zinc-500 mt-2">
            Something went wrong while uploading.
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setUploadState("idle");
              setPipelineStage(0);
            }}
            className="
            mt-6
            text-sm
            text-zinc-400
            hover:text-zinc-200
          "
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
