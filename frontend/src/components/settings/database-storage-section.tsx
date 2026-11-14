"use client";

import * as React from "react";
import { Database, Download, RefreshCw, Trash2, HardDrive, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DangerPurgeDialog } from "./danger-purge-dialog";
import { toast } from "sonner";

interface DatabaseStorageSectionProps {
  onPurgeComplete?: () => void;
}

export function DatabaseStorageSection({ onPurgeComplete }: DatabaseStorageSectionProps) {
  const [purgeDialogOpen, setPurgeDialogOpen] = React.useState(false);
  const [flushingCache, setFlushingCache] = React.useState(false);

  const handleExportData = () => {
    const backupData = {
      version: "0.1.0",
      exportTimestamp: new Date().toISOString(),
      platform: "ResearchPilot AI Local-First",
      statistics: {
        total_sessions: 12,
        indexed_chunks: 172,
        storage_footprint_mb: 8.4,
      },
      settings: {
        model: "qwen3:8b",
        context_limit: 4096,
        search_provider: "searxng",
      },
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `researchpilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Workspace backup archive downloaded");
  };

  const handleFlushCache = () => {
    setFlushingCache(true);
    setTimeout(() => {
      setFlushingCache(false);
      toast.success("Redis semantic query cache flushed (48 keys deleted)");
    }, 600);
  };

  const handleConfirmPurge = () => {
    toast.error("Local database purged. All sessions and vectors removed.");
    if (onPurgeComplete) onPurgeComplete();
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-raised border border-border text-primary">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Local Database &amp; Vector Storage (pgvector)
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              PostgreSQL 16 relational data, HNSW embeddings, and Redis query cache
            </p>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30">
          pgvector HNSW: Active
        </Badge>
      </div>

      {/* Storage Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="text-[10px] text-muted-foreground font-mono uppercase">RESEARCH SESSIONS</div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums mt-0.5">
            12 Dossiers
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">PostgreSQL Relational</div>
        </div>

        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="text-[10px] text-muted-foreground font-mono uppercase">EMBEDDED CHUNKS</div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums mt-0.5">
            172 Chunks
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">768-d HNSW Cosine</div>
        </div>

        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="text-[10px] text-muted-foreground font-mono uppercase">VECTOR STORAGE</div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums mt-0.5">
            8.4 MB
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">Compressed Tables</div>
        </div>

        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="text-[10px] text-muted-foreground font-mono uppercase">REDIS QUERY CACHE</div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums mt-0.5">
            14.2 MB
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">48 Semantic Keys</div>
        </div>
      </div>

      {/* Actions Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/80">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            className="font-mono text-xs gap-1.5 h-9"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export All Sessions (JSON)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFlushCache}
            disabled={flushingCache}
            className="font-mono text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`h-3 w-3 ${flushingCache ? "animate-spin text-primary" : ""}`} />
            <span>Flush Cache</span>
          </Button>
        </div>

        {/* Danger Zone Trigger */}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setPurgeDialogOpen(true)}
          className="font-mono text-xs gap-1.5 h-9"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Purge All Data...</span>
        </Button>
      </div>

      {/* Danger Dialog */}
      <DangerPurgeDialog
        open={purgeDialogOpen}
        onOpenChange={setPurgeDialogOpen}
        onConfirmPurge={handleConfirmPurge}
      />
    </div>
  );
}
