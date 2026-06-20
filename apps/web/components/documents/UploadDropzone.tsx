"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api/client";
import axios from "axios";
import { UploadCloud, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "success" | "error";

export function UploadDropzone({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const { getToken, orgId } = useAuth();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadState("uploading");
      setProgress(0);

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
            mimeType: file.type, // Added to match the Prisma Document schema expectations
            sizeBytes: file.size,
            organizationId: orgId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-organization-id": orgId, // Passes org context commonly expected by Clerk backend middlewares
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
        await apiClient.post(
          `/api/documents/${documentId}/process`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
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
    [getToken, orgId],
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

      ${uploadState === "uploading" ? "pointer-events-none" : ""}
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
          <div className="flex gap-2 flex-wrap justify-center mt-6">
            <div className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
              PDF
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-500">Maximum file size: 50 MB</p>
        </div>
      )}

      {uploadState === "uploading" && (
        <div className="w-full max-w-md px-8">
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />

            <h3 className="font-medium">Uploading document...</h3>

            <p className="text-sm text-zinc-500 mt-1">
              Securely transferring file
            </p>

            <div className="w-full mt-6">
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-zinc-200 transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-center text-sm text-zinc-400">
                {progress}%
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadState === "success" && (
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />

          <h3 className="font-medium">Document uploaded</h3>

          <p className="text-sm text-zinc-500 mt-2">Processing has started.</p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setUploadState("idle");
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
