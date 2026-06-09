import { UploadDropzone } from "@/components/documents/UploadDropzone";

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
        <p className="text-zinc-500 mt-2">
          Securely upload a document to your organization&apos;s private
          knowledge base.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm">
        <UploadDropzone />
      </div>
    </div>
  );
}
