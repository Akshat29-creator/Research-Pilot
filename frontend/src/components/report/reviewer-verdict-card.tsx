"use client";

import * as React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ReviewerVerdictCardProps {
  score?: number;
  totalAssertions?: number;
  verifiedCount?: number;
  humanApprovedCount?: number;
  className?: string;
}

export function ReviewerVerdictCard({
  score = 0.916,
  totalAssertions = 12,
  verifiedCount = 11,
  humanApprovedCount = 1,
  className,
}: ReviewerVerdictCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs transition-all",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground font-mono text-sm">
                Adversarial Grounding Gate: VERIFIED
              </span>
              <Badge variant="success" className="font-mono text-[10px] py-0 px-1.5">
                {Math.round(score * 100)}% Grounded
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              Automated citation audit cross-referenced 12 assertions against ingested vector chunks.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 text-[11px] font-mono gap-1 text-muted-foreground hover:text-foreground shrink-0"
        >
          <span>{isExpanded ? "Hide Audit Log" : "Inspect Audit Log"}</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-500/20 text-[11px] font-mono">
        <div className="p-2 rounded bg-surface/60 border border-border">
          <span className="text-muted-foreground block text-[10px]">Corroborated</span>
          <span className="font-bold text-emerald-400">{verifiedCount} / {totalAssertions} claims</span>
        </div>
        <div className="p-2 rounded bg-surface/60 border border-border">
          <span className="text-muted-foreground block text-[10px]">Human Approved</span>
          <span className="font-bold text-amber-400">{humanApprovedCount} extrapolation</span>
        </div>
        <div className="p-2 rounded bg-surface/60 border border-border">
          <span className="text-muted-foreground block text-[10px]">Hallucinations</span>
          <span className="font-bold text-foreground">0.00 (Zero Detected)</span>
        </div>
      </div>

      {/* Expanded Audit Log Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs font-mono">
          <div className="p-2.5 rounded bg-surface border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Primary Source Verification: 11 Assertions</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Exact mathematical and empirical metrics (HNSW 1.8GB, IVFFlat 240MB, 98.4% recall@10) directly validated against MIT CSAIL (Zhang & Mehta 2024) and pgvector v0.7.0 benchmarks.
            </p>
          </div>

          <div className="p-2.5 rounded bg-surface border border-amber-500/30 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Human-in-the-Loop Signoff (Loop 1)</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Assertion: "IVFFlat recall degrades exponentially when dataset exceeds maintenance_work_mem by more than 4x" approved by operator <code>pilot@researchpilot.com</code> as sound domain deduction based on inverted list page spilling behavior.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
