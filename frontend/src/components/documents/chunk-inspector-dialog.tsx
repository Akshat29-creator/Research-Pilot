"use client";

import * as React from "react";
import {
  FileText,
  Layers,
  Search,
  Download,
  Copy,
  Check,
  Hash,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { IngestedDocument, IngestedChunk } from "@/components/documents/document-types";
import { toast } from "sonner";

export interface ChunkInspectorDialogProps {
  document: IngestedDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChunkInspectorDialog({
  document,
  isOpen,
  onClose,
}: ChunkInspectorDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!document) return null;

  const filteredChunks = document.chunks.filter((chunk) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      chunk.textSnippet.toLowerCase().includes(q) ||
      chunk.vectorId.toLowerCase().includes(q) ||
      String(chunk.pageNumber).includes(q)
    );
  });

  const handleCopyChunk = (chunk: IngestedChunk) => {
    navigator.clipboard.writeText(chunk.textSnippet);
    setCopiedId(chunk.id);
    toast.success(`Copied chunk #${chunk.chunkIndex} text to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChunks = () => {
    const blob = new Blob([JSON.stringify(document.chunks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.fileName}-chunks.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${document.chunks.length} chunks to JSON`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-[10px]">
              PGVECTOR CHUNK EXPLORER
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {document.chunkCount} Total Chunks • {document.embeddingModel}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground truncate">
            {document.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            {document.fileName} • {document.pageCount} Pages • {document.vectorDimensions}-d Vectors
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 pt-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter chunks by keyword, page, or vector ID..."
              className="h-8 pl-8 text-xs font-mono bg-surface"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportChunks}
            className="h-8 gap-1.5 text-xs font-mono shrink-0"
          >
            <Download className="h-3 w-3" />
            <span>Export Chunks</span>
          </Button>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mt-2">
          {filteredChunks.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No chunks match your search query.
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="rounded-lg border border-border bg-surface-raised p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                      Chunk #{chunk.chunkIndex}
                    </span>
                    <span>Page {chunk.pageNumber}</span>
                    <span>•</span>
                    <span>{chunk.tokenCount} tokens</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/80 truncate max-w-[120px]">
                      {chunk.vectorId}
                    </span>
                    <button
                      onClick={() => handleCopyChunk(chunk)}
                      className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground"
                      title="Copy chunk text"
                    >
                      {copiedId === chunk.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-foreground/90 leading-relaxed font-sans text-xs bg-surface p-2.5 rounded border border-border/60">
                  {chunk.textSnippet}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
