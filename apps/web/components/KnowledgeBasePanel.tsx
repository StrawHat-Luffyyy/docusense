"use client";

import React from "react";
import {
  Database,
  FileText,
  Layers,
  HardDrive,
  Cpu,
  Zap,
  ArrowDown,
  CheckCircle,
  Brain,
  Search,
  MessageSquare,
  Shield,
} from "lucide-react";

interface KnowledgeBaseData {
  totalDocuments: number;
  totalChunks: number;
  totalPages: number;
  storageUsedBytes: number;
  embeddingsGenerated: number;
  statusBreakdown: Record<string, number>;
}

interface InfrastructureData {
  vectorStore: string;
  embeddingModel: string;
  llmProvider: string;
  llmModel: string;
  chunkingStrategy: string;
  vectorDimensions: number;
}

interface KnowledgeBasePanelProps {
  knowledgeBase: KnowledgeBaseData | null;
  infrastructure: InfrastructureData | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function InfraCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/50">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-xs font-semibold text-foreground font-mono">
        {value}
      </span>
    </div>
  );
}

const PIPELINE_STEPS = [
  { icon: FileText, label: "PDF Ingestion", color: "text-blue-400" },
  { icon: Layers, label: "Text Extraction", color: "text-cyan-400" },
  { icon: Cpu, label: "Semantic Chunking", color: "text-violet-400" },
  { icon: Brain, label: "Embedding Generation", color: "text-purple-400" },
  { icon: Database, label: "Vector Database", color: "text-indigo-400" },
  { icon: Search, label: "Retriever", color: "text-emerald-400" },
  { icon: MessageSquare, label: "LLM Generation", color: "text-amber-400" },
  { icon: Shield, label: "Grounded Response", color: "text-green-400" },
];

export default function KnowledgeBasePanel({
  knowledgeBase,
  infrastructure,
}: KnowledgeBasePanelProps) {
  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={FileText}
          label="Documents Indexed"
          value={knowledgeBase?.statusBreakdown?.INDEXED ?? 0}
          sub={`${knowledgeBase?.totalDocuments ?? 0} total`}
        />
        <MetricCard
          icon={Layers}
          label="Total Chunks"
          value={knowledgeBase?.totalChunks?.toLocaleString() ?? "0"}
          sub={`${knowledgeBase?.totalPages ?? 0} pages processed`}
        />
        <MetricCard
          icon={Zap}
          label="Embeddings"
          value={knowledgeBase?.embeddingsGenerated?.toLocaleString() ?? "0"}
          sub={`${infrastructure?.vectorDimensions ?? 768}-dim vectors`}
        />
        <MetricCard
          icon={HardDrive}
          label="Storage Used"
          value={formatBytes(knowledgeBase?.storageUsedBytes ?? 0)}
          sub="Document corpus"
        />
      </div>

      {/* Infrastructure + Pipeline Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Infrastructure Info */}
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Infrastructure
          </h3>
          <div className="space-y-2">
            <InfraCard
              label="Vector Store"
              value={infrastructure?.vectorStore ?? "Pinecone"}
            />
            <InfraCard
              label="Embedding Model"
              value={infrastructure?.embeddingModel ?? "gemini-embedding-001"}
            />
            <InfraCard
              label="LLM Provider"
              value={infrastructure?.llmModel ?? "gemini-2.5-flash"}
            />
            <InfraCard
              label="Chunking"
              value={infrastructure?.chunkingStrategy ?? "Semantic"}
            />
            <InfraCard
              label="Vector Dimensions"
              value={String(infrastructure?.vectorDimensions ?? 768)}
            />
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-success/5 border border-success/20">
              <CheckCircle className="w-3.5 h-3.5 text-success" />
              <span className="text-xs font-medium text-success">
                All Systems Operational
              </span>
            </div>
          </div>
        </div>

        {/* RAG Pipeline Visualization */}
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            RAG Pipeline
          </h3>
          <div className="flex flex-col items-center">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors">
                  <div
                    className={`w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0`}
                  >
                    <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {step.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex flex-col items-center py-0.5">
                    <ArrowDown className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
