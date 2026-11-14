"use client";

import * as React from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  Cpu,
  Layers,
  Database,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IngestedDocument } from "@/components/documents/document-types";
import { toast } from "sonner";

export interface UploadZoneProps {
  onDocumentIngested: (doc: IngestedDocument) => void;
  className?: string;
}

type IngestionStage = "idle" | "parsing" | "chunking" | "embedding" | "indexing" | "complete";

export function UploadZone({ onDocumentIngested, className }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [activeFile, setActiveFile] = React.useState<File | null>(null);
  const [stage, setStage] = React.useState<IngestionStage>("idle");
  const [progress, setProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const startIngestionSimulation = (file: File) => {
    setActiveFile(file);
    setStage("parsing");
    setProgress(15);

    // Stage 1: Parsing
    setTimeout(() => {
      setStage("chunking");
      setProgress(45);
    }, 800);

    // Stage 2: Embedding
    setTimeout(() => {
      setStage("embedding");
      setProgress(75);
    }, 1800);

    // Stage 3: Indexing
    setTimeout(() => {
      setStage("indexing");
      setProgress(95);
    }, 2800);

    // Stage 4: Complete
    setTimeout(() => {
      setStage("complete");
      setProgress(100);

      const newDoc: IngestedDocument = {
        id: `doc_${Math.random().toString(36).substring(2, 9)}`,
        fileName: file.name,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        author: "Uploaded by User",
        fileSizeBytes: file.size || 1850000,
        pageCount: 14,
        chunkCount: 32,
        status: "indexed",
        embeddingModel: "nomic-embed-text",
        vectorDimensions: 768,
        createdAt: new Date().toISOString(),
        chunks: [
          {
            id: `chk_${Math.random().toString(36).substring(2, 7)}`,
            chunkIndex: 1,
            pageNumber: 1,
            tokenCount: 420,
            textSnippet: `Primary extracted section from ${file.name}. Embedded into PostgreSQL 16 pgvector HNSW index.`,
            vectorId: `vec_${Math.random().toString(36).substring(2, 7)}`,
          },
        ],
      };

      onDocumentIngested(newDoc);
      toast.success(`Successfully parsed and indexed: "${file.name}" (32 chunks)`);

      setTimeout(() => {
        setStage("idle");
        setActiveFile(null);
        setProgress(0);
      }, 1500);
    }, 3600);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      startIngestionSimulation(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      startIngestionSimulation(e.target.files[0]);
    }
  };

  const handleCancel = () => {
    setStage("idle");
    setActiveFile(null);
    setProgress(0);
    toast.info("Ingestion cancelled.");
  };

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleFileChange}
        className="hidden"
      />

      {stage === "idle" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "group rounded-xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer select-none",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-zinc-500 hover:bg-surface-raised bg-surface/50"
          )}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-105 transition-transform">
              <UploadCloud className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground tracking-tight">
                Drag & drop research papers or click to browse
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Supports PDF, Markdown, and TXT files. Automatic text extraction via PyMuPDF, recursive token chunking, and 768-d vector embedding.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] font-mono text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-surface border border-border">PDF up to 50MB</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border">nomic-embed-text (768-d)</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border">Local PostgreSQL pgvector</span>
            </div>
          </div>
        </div>
      ) : (
        /* Active Ingestion Progress Card */
        <div className="rounded-xl border border-primary/30 bg-surface p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                {stage === "complete" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-foreground font-mono block">
                  {activeFile?.name || "Ingesting Research Paper"}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {stage === "parsing" && "Step 1/4: Parsing text & structure via PyMuPDF..."}
                  {stage === "chunking" && "Step 2/4: Chunking content (500 tokens, 10% overlap)..."}
                  {stage === "embedding" && "Step 3/4: Generating 768-d vectors (nomic-embed-text)..."}
                  {stage === "indexing" && "Step 4/4: Constructing PostgreSQL pgvector HNSW index..."}
                  {stage === "complete" && "Ingestion complete: Ready for hybrid retrieval."}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {progress}%
              </Badge>
              {stage !== "complete" && (
                <button
                  onClick={handleCancel}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-raised text-xs"
                  title="Cancel upload"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Pipeline Stage Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
            <div
              className={cn(
                "p-2 rounded border transition-colors",
                stage === "parsing"
                  ? "border-primary bg-primary/5 text-primary font-bold"
                  : stage === "chunking" || stage === "embedding" || stage === "indexing" || stage === "complete"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : "border-border text-muted-foreground bg-surface-raised"
              )}
            >
              1. PyMuPDF Extract
            </div>
            <div
              className={cn(
                "p-2 rounded border transition-colors",
                stage === "chunking"
                  ? "border-primary bg-primary/5 text-primary font-bold"
                  : stage === "embedding" || stage === "indexing" || stage === "complete"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : "border-border text-muted-foreground bg-surface-raised"
              )}
            >
              2. 500-Token Chunking
            </div>
            <div
              className={cn(
                "p-2 rounded border transition-colors",
                stage === "embedding"
                  ? "border-primary bg-primary/5 text-primary font-bold"
                  : stage === "indexing" || stage === "complete"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : "border-border text-muted-foreground bg-surface-raised"
              )}
            >
              3. Vector Embedding
            </div>
            <div
              className={cn(
                "p-2 rounded border transition-colors",
                stage === "indexing"
                  ? "border-primary bg-primary/5 text-primary font-bold"
                  : stage === "complete"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : "border-border text-muted-foreground bg-surface-raised"
              )}
            >
              4. pgvector HNSW Index
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
