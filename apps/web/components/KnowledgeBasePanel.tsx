"use client";

import React from "react";
import {
  Database,
  FileText,
  Layers,
  HardDrive,
  Cpu,
  Zap,
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
    <div className="rounded-xl border border-border bg-card/50 p-5 hover:border-primary/20 hover:bg-card/60 transition-all duration-200">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function InfraCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20 border border-border/50">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Infrastructure Info */}
        <div className="rounded-xl border border-border bg-card/30 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Infrastructure Specifications
            </h3>
            <div className="space-y-2.5">
              <InfraCard
                label="Vector Database"
                value={infrastructure?.vectorStore ?? "Pinecone"}
              />
              <InfraCard
                label="Embedding Model"
                value={infrastructure?.embeddingModel ?? "gemini-embedding-001"}
              />
              <InfraCard
                label="LLM Model"
                value={infrastructure?.llmModel ?? "gemini-2.5-flash"}
              />
              <InfraCard
                label="Chunking Strategy"
                value={infrastructure?.chunkingStrategy ?? "Semantic"}
              />
              <InfraCard
                label="Vector Dimensions"
                value={String(infrastructure?.vectorDimensions ?? 768)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 py-2.5 px-3 rounded-lg bg-success/5 border border-success/20">
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-medium text-success">
              All Systems Operational
            </span>
          </div>
        </div>

        {/* RAG Pipeline Visualization */}
        <div className="rounded-xl border border-border bg-card/30 p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            RAG Ingestion Pipeline
          </h3>
          <div className="relative pl-6 border-l border-border/80 ml-3 space-y-3.5">
            {PIPELINE_STEPS.map((step, i) => (
              <div
                key={step.label}
                className="relative flex items-center justify-between group"
              >
                <div className="absolute -left-[37px] flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border group-hover:border-primary/50 transition-colors">
                  <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                </div>
                <span className="text-xs font-medium text-foreground">
                  {step.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
