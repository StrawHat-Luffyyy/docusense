"use client";

import React from "react";
import { X } from "lucide-react";
import { UploadDropzone } from "./UploadDropzone";

export function UploadModal({
  onClose,
  onUploadComplete,
}: {
  onClose: () => void;
  onUploadComplete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <UploadDropzone onUploadComplete={onUploadComplete} />
      </div>
    </div>
  );
}
