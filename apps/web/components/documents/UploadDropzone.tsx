"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api/client";
import axios from "axios";
import { UploadCloud, File, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "success" | "error";

export function UploadDropzone() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const { getToken, orgId } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      setUploadState("success");
      toast.success("Document uploaded successfully!");
    } catch (error: any) {
      console.error("Upload failed:", error);
      setUploadState("error");

      // Extract error message from response
      let errorMessage = "Failed to upload document";
      if (error.response?.data?.error) {
        if (typeof error.response.data.error === "string") {
          errorMessage = error.response.data.error;
        } else if (error.response.data.error?.message) {
          errorMessage = error.response.data.error.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors
        ${isDragActive ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" : "border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"}
        ${uploadState === "uploading" ? "pointer-events-none opacity-80" : ""}
      `}
    >
      <input {...getInputProps()} />

      {uploadState === "idle" && (
        <>
          <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4">
            <UploadCloud className="w-8 h-8 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Click or drag a file to this area to upload
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Support for a single PDF, DOCX, TXT, or MD file. Maximum size 50MB.
          </p>
        </>
      )}

      {uploadState === "uploading" && (
        <div className="flex flex-col items-center w-full max-w-xs">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Uploading directly to secure storage...
          </p>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {uploadState === "success" && (
        <>
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Upload Complete
          </p>
          <p
            className="text-xs text-zinc-500 mt-2 underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setUploadState("idle");
            }}
          >
            Upload another file
          </p>
        </>
      )}

      {uploadState === "error" && (
        <>
          <XCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-sm font-medium text-red-500">Upload Failed</p>
          <p
            className="text-xs text-zinc-500 mt-2 underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setUploadState("idle");
            }}
          >
            Try again
          </p>
        </>
      )}
    </div>
  );
}
