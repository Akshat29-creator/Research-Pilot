"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  CornerDownLeft,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  flaggedClaim?: {
    section: string;
    claimText: string;
    reason: string;
    sourceSuggestion?: string;
    iteration: number;
    maxIterations: number;
  };
}

export function ApprovalModal({
  isOpen,
  onClose,
  onApprove,
  onReject,
  flaggedClaim = {
    section: "Section 3: Empirical Index Overhead & Sizing",
    claimText: "IVFFlat recall degrades exponentially when dataset exceeds maintenance_work_mem by more than 4x.",
    reason: "Claim lacks a primary benchmark citation or mathematical proof in the ingested 14 sources. It appears to be an inferred generalization.",
    sourceSuggestion: "Zhang & Mehta (2024) tested up to 2x maintenance_work_mem only.",
    iteration: 1,
    maxIterations: 3,
  },
}: ApprovalModalProps) {
  // Keyboard shortcut listener for Enter (Approve) and Esc (Reject/Close)
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onApprove();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onApprove, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive" className="font-mono text-[10px] gap-1">
              <ShieldAlert className="h-3 w-3" />
              HUMAN-IN-THE-LOOP CHECKPOINT
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">
              Loop Iteration {flaggedClaim.iteration} of {flaggedClaim.maxIterations}
            </span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Adversarial Reviewer Flagged Unverified Claim
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            The automated verification gate has paused synthesis. Please confirm whether to accept this deduction or send it back for re-analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target Section */}
          <div className="text-[11px] font-mono text-muted-foreground">
            Target: <span className="font-semibold text-foreground">{flaggedClaim.section}</span>
          </div>

          {/* Flagged statement box */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Flagged Claim Under Review</span>
            </div>
            <p className="text-xs text-foreground font-serif italic border-l-2 border-amber-500 pl-3 py-0.5">
              "{flaggedClaim.claimText}"
            </p>
          </div>

          {/* Reviewer reasoning */}
          <div className="rounded-lg border border-border bg-surface-raised p-3 text-xs space-y-2">
            <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Reviewer Audit Log
            </span>
            <p className="text-foreground/90 leading-relaxed text-xs">
              {flaggedClaim.reason}
            </p>
            {flaggedClaim.sourceSuggestion && (
              <div className="text-[11px] font-mono text-muted-foreground pt-1 border-t border-border">
                Note: {flaggedClaim.sourceSuggestion}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between items-center border-t border-border pt-4">
          <div className="text-[10px] font-mono text-muted-foreground hidden sm:block">
            <span>Press <kbd className="px-1 py-0.5 rounded border border-border bg-surface text-foreground font-semibold">Enter ↵</kbd> to approve, <kbd className="px-1 py-0.5 rounded border border-border bg-surface text-foreground font-semibold">Esc</kbd> to reject</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="gap-1.5 flex-1 sm:flex-initial text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
              <span>Reject & Revise (Loop {flaggedClaim.iteration + 1})</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={onApprove}
              className="gap-1.5 flex-1 sm:flex-initial text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Approve & Finalize</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
