"use client";

import * as React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";

export type AgentNodeStatus = "pending" | "running" | "completed" | "error";

export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  role: string;
  status: AgentNodeStatus;
  currentTask?: string;
  duration?: string;
  tool?: string;
  model?: string;
  retries?: number;
  maxRetries?: number;
  iteration?: number;
  maxIterations?: number;
  tokens?: { prompt: number; completion: number };
  error?: string;
}

const iconMap: Record<string, React.ElementType> = {
  Orchestrator: Bot,
  Research: Search,
  Analysis: Terminal,
  Writer: FileText,
  Reviewer: ShieldCheck,
};

export function AgentNode({ data }: { data: AgentNodeData }) {
  const Icon = iconMap[data.label] || Bot;
  const isRunning = data.status === "running";
  const isCompleted = data.status === "completed";
  const isError = data.status === "error";

  return (
    <div
      className={cn(
        "w-64 rounded-xl border bg-surface p-3.5 shadow-md transition-all select-none text-left font-sans",
        isRunning &&
          "border-primary ring-2 ring-primary/20 shadow-lg bg-surface-raised animate-pulse-subtle",
        isCompleted && "border-border hover:border-zinc-500",
        isError && "border-destructive ring-1 ring-destructive/30 bg-destructive/5",
        data.status === "pending" && "border-border/60 opacity-60 bg-surface/80"
      )}
    >
      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-border"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-primary"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/70 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs",
              isRunning && "border-primary/40 bg-primary/10 text-primary",
              isCompleted && "border-border bg-surface-raised text-foreground",
              isError && "border-destructive/40 bg-destructive/10 text-destructive",
              data.status === "pending" && "border-border bg-muted/20 text-muted-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-xs text-foreground tracking-tight truncate">
              {data.label}
            </h4>
            <span className="font-mono text-[9px] text-muted-foreground uppercase block truncate">
              {data.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isRunning ? (
            <Badge variant="default" className="text-[9px] py-0 px-1 font-mono gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              RUNNING
            </Badge>
          ) : isCompleted ? (
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-emerald-400 border-emerald-500/30">
              DONE
            </Badge>
          ) : isError ? (
            <Badge variant="destructive" className="text-[9px] py-0 px-1 font-mono">
              ERROR
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground">
              PENDING
            </Badge>
          )}
        </div>
      </div>

      {/* Task & Diagnostic Description */}
      <div className="space-y-1.5 text-[11px]">
        {data.currentTask && (
          <p className="text-foreground/90 font-medium line-clamp-2 leading-snug">
            {data.currentTask}
          </p>
        )}

        {data.tool && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground truncate">
            <span className="text-zinc-500">Tool:</span>
            <span className="text-foreground truncate">{data.tool}</span>
          </div>
        )}

        {data.error && (
          <p className="text-[10px] text-destructive leading-tight font-mono truncate">
            {data.error}
          </p>
        )}
      </div>

      {/* Footer Metrics (Timing, Tokens, Retries) */}
      <div className="mt-3 pt-2 border-t border-border/70 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          {data.duration && (
            <span className="text-foreground font-semibold tabular-nums">
              {data.duration}
            </span>
          )}
          {data.tokens && (
            <span className="tabular-nums">
              {data.tokens.prompt + data.tokens.completion} tok
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {data.iteration !== undefined && (
            <span className="px-1 py-0.5 rounded bg-surface-raised border border-border text-foreground">
              Loop {data.iteration}/{data.maxIterations || 3}
            </span>
          )}
          {data.retries !== undefined && data.retries > 0 && (
            <span className="px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
              Retry {data.retries}/{data.maxRetries || 2}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
