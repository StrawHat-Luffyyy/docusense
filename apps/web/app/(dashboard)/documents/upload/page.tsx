import { UploadDropzone } from "@/components/documents/UploadDropzone";

export default function UploadPage() {
  return (
    <div className="max-w-5xl mx-auto pt-12 px-6">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight">
          Upload documents
        </h1>

        <p className="mt-3 text-sm text-zinc-400">
          Add files to your knowledge base and make them searchable with AI.
        </p>
      </div>

      <UploadDropzone />
    </div>
  );
}
