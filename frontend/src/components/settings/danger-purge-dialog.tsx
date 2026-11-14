"use client";

import * as React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DangerPurgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPurge: () => void;
}

const REQUIRED_CONFIRM_TEXT = "DELETE-ALL-DATA";

export function DangerPurgeDialog({
  open,
  onOpenChange,
  onConfirmPurge,
}: DangerPurgeDialogProps) {
  const [confirmInput, setConfirmInput] = React.useState("");

  const isConfirmed = confirmInput.trim() === REQUIRED_CONFIRM_TEXT;

  const handlePurge = () => {
    if (!isConfirmed) return;
    onConfirmPurge();
    setConfirmInput("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border sm:rounded-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-rose-500">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Purge All Local Research Data?
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            This action is <span className="font-semibold text-rose-400">permanent and irreversible</span>.
            All research dossiers, uploaded PDF documents, vector embeddings in pgvector, and agent traces
            will be dropped from your local PostgreSQL database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs space-y-1">
            <div className="font-semibold text-rose-400">Irreversible Data Deletion:</div>
            <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5 font-mono">
              <li>All research sessions &amp; markdown reports</li>
              <li>172 vectorized chunks in pgvector (HNSW index)</li>
              <li>Source citation mappings &amp; cached search queries</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground">
              Type <span className="font-bold text-rose-400 select-all">{REQUIRED_CONFIRM_TEXT}</span> to proceed:
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={REQUIRED_CONFIRM_TEXT}
              className="font-mono text-xs border-border bg-surface-raised"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-mono"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!isConfirmed}
            onClick={handlePurge}
            className="text-xs font-mono gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge Everything</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
