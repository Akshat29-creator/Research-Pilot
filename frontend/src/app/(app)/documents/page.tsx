"use client";

import * as React from "react";
import { FileUp, FileText, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

export default function DocumentsPage() {
  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-[10px]">
              KNOWLEDGE BASE
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">pgvector chunk storage</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Document Ingestion Library
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload PDFs and research papers for local extraction, embedding with nomic-embed-text, and hybrid retrieval.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.info("PDF ingestion pipeline will activate in Phase 3 & 5!")}
          className="gap-1.5 self-start sm:self-auto"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          <span>Upload PDF Document</span>
        </Button>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-sm">
        <EmptyState
          icon={FileText}
          title="No Documents Uploaded Yet"
          description="Drag and drop research PDFs or academic publications here to parse page offsets and chunk vectors."
          actionLabel="Select PDF File"
          onAction={() => toast.info("PDF file selector will activate in Phase 5!")}
        />
      </div>
    </div>
  );
}
