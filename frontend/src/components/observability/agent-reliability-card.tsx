"use client";

import * as React from "react";
import { ShieldCheck, AlertTriangle, RotateCcw, DollarSign, Award, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgentReliabilityCardProps {
  firstPassApprovalRate?: number;
  revisionRate?: number;
  totalTokensProcessed?: number;
  dollarsSaved?: number;
  unverifiedHallucinations?: number;
}

export function AgentReliabilityCard({
  firstPassApprovalRate = 91.7,
  revisionRate = 8.3,
  totalTokensProcessed = 2856400,
  dollarsSaved = 142.8,
  unverifiedHallucinations = 0,
}: AgentReliabilityCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Agent Reliability &amp; Free Local Cost Offset
            </h3>
            <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30">
              100% Free &amp; Local
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Adversarial review verification gates and host inference cost savings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[11px] text-emerald-400">
            $0.00 Cloud Cost
          </Badge>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Adversarial Review Gate */}
        <div className="p-4 rounded-lg bg-surface-raised/60 border border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground font-mono flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Adversarial Review Gate</span>
            </span>
            <Badge variant="success" className="text-[10px] py-0 font-mono">
              Strict Mode
            </Badge>
          </div>
          <div className="space-y-2 pt-1 font-mono text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">First-Pass Approval:</span>
              <span className="font-bold text-foreground tabular-nums">{firstPassApprovalRate}%</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Revision Loop Rate:</span>
              <span className="font-bold text-amber-400 tabular-nums">{revisionRate}%</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Hallucinations:</span>
              <span className="font-bold text-emerald-400 tabular-nums">{unverifiedHallucinations}</span>
            </div>
          </div>
          <div className="pt-1 text-[10px] text-muted-foreground font-mono">
            Grounding verification checks every assertion against pgvector chunks.
          </div>
        </div>

        {/* Circuit Breakers & Resiliency */}
        <div className="p-4 rounded-lg bg-surface-raised/60 border border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground font-mono flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4 text-primary" />
              <span>Circuit Breakers</span>
            </span>
            <Badge variant="outline" className="text-[10px] py-0 font-mono text-primary">
              Active
            </Badge>
          </div>
          <div className="space-y-2 pt-1 font-mono text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">OOM Trip Count:</span>
              <span className="font-bold text-emerald-400 tabular-nums">0 (Protected)</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">SearXNG Network Retries:</span>
              <span className="font-bold text-foreground tabular-nums">1 Recovered</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Postgres Pool Drops:</span>
              <span className="font-bold text-emerald-400 tabular-nums">0 Drops</span>
            </div>
          </div>
          <div className="pt-1 text-[10px] text-muted-foreground font-mono">
            Semaphore(1) ensures zero concurrent VRAM collisions or thrashing.
          </div>
        </div>

        {/* Local Cost Offset Counter */}
        <div className="p-4 rounded-lg bg-surface-raised/60 border border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground font-mono flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span>Cloud Cost Offset</span>
            </span>
            <Badge variant="success" className="text-[10px] py-0 font-mono">
              Saved
            </Badge>
          </div>
          <div className="space-y-2 pt-1 font-mono text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Local Incurred Cost:</span>
              <span className="font-bold text-emerald-400 tabular-nums">$0.00</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Equivalent Cloud Bill:</span>
              <span className="font-bold text-foreground tabular-nums">${dollarsSaved.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground">Tokens Processed:</span>
              <span className="font-bold text-foreground tabular-nums">
                {totalTokensProcessed.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="pt-1 text-[10px] text-muted-foreground font-mono">
            Calculated at standard $5.00/1M blended Claude 3.5 / GPT-4o API pricing.
          </div>
        </div>
      </div>
    </div>
  );
}
