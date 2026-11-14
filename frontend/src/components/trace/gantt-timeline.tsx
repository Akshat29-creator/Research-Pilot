"use client";

import * as React from "react";
import {
  Clock,
  Cpu,
  Layers,
  Wrench,
  Bot,
  ShieldCheck,
  Search,
  Terminal,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TraceSpan } from "@/components/trace/trace-data";

export interface GanttTimelineProps {
  spans: TraceSpan[];
  totalDurationMs: number;
  selectedSpanId: string | null;
  onSelectSpan: (span: TraceSpan) => void;
  className?: string;
}

const agentColorConfig: Record<
  TraceSpan["agent"],
  { bar: string; border: string; text: string; bg: string; icon: React.ElementType }
> = {
  orchestrator: {
    bar: "bg-indigo-500",
    border: "border-indigo-500/40",
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
    icon: Bot,
  },
  research: {
    bar: "bg-emerald-500",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: Search,
  },
  analysis: {
    bar: "bg-amber-500",
    border: "border-amber-500/40",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: Terminal,
  },
  writer: {
    bar: "bg-sky-500",
    border: "border-sky-500/40",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    icon: FileText,
  },
  reviewer: {
    bar: "bg-rose-500",
    border: "border-rose-500/40",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    icon: ShieldCheck,
  },
  system: {
    bar: "bg-purple-500",
    border: "border-purple-500/40",
    text: "text-purple-400",
    bg: "bg-purple-500/10",
    icon: ShieldAlert,
  },
};

export function GanttTimeline({
  spans,
  totalDurationMs,
  selectedSpanId,
  onSelectSpan,
  className,
}: GanttTimelineProps) {
  // Compute time intervals (e.g., 0s, 1s, 2s, 3s, 4s, 5s)
  const totalSeconds = Math.ceil(totalDurationMs / 1000);
  const timeMarkers = Array.from({ length: totalSeconds + 1 }, (_, i) => i * 1000);

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-surface shadow-xs overflow-hidden", className)}>
      {/* Gantt Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">
            Execution Timeline (Gantt)
          </h3>
          <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface border border-border">
            Total Latency: {totalDurationMs}ms ({(totalDurationMs / 1000).toFixed(2)}s)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Agent Node
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Tool Invocation
          </span>
        </div>
      </div>

      {/* Gantt Canvas Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] p-4 space-y-1 relative">
          {/* Time Ruler (X-Axis) */}
          <div className="flex border-b border-border pb-2 mb-2 text-[10px] font-mono text-muted-foreground select-none">
            <div className="w-56 shrink-0 font-sans font-medium text-muted-foreground/80">
              Span Name & Agent
            </div>
            <div className="flex-1 relative h-5">
              {timeMarkers.map((ms) => {
                const leftPct = (ms / totalDurationMs) * 100;
                if (leftPct > 100) return null;
                return (
                  <div
                    key={ms}
                    className="absolute -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${leftPct}%` }}
                  >
                    <span>{(ms / 1000).toFixed(1)}s</span>
                    <div className="h-1.5 w-px bg-border mt-0.5" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Span Rows */}
          {spans.map((span) => {
            const isSelected = selectedSpanId === span.id;
            const config = agentColorConfig[span.agent] || agentColorConfig.system;
            const Icon = config.icon;

            const leftPct = (span.startTimeMs / totalDurationMs) * 100;
            const widthPct = Math.max((span.durationMs / totalDurationMs) * 100, 1.5);
            const isSubSpan = !!span.parentSpanId;

            return (
              <div
                key={span.id}
                onClick={() => onSelectSpan(span)}
                className={cn(
                  "group flex items-center h-9 px-2 rounded-md transition-colors cursor-pointer text-xs select-none",
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-surface-raised border border-transparent"
                )}
              >
                {/* Left Label */}
                <div className="w-56 shrink-0 flex items-center gap-2 pr-3 min-w-0">
                  {isSubSpan && (
                    <span className="font-mono text-muted-foreground/50 text-[10px] pl-2">
                      ↳
                    </span>
                  )}
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", config.text)} />
                  <span className="font-mono text-xs text-foreground truncate font-medium">
                    {span.name}
                  </span>
                  {span.kind === "tool" && (
                    <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono">
                      tool
                    </Badge>
                  )}
                </div>

                {/* Right Bar Area */}
                <div className="flex-1 relative h-6 bg-surface-raised/40 rounded flex items-center overflow-hidden">
                  {/* Vertical grid lines */}
                  {timeMarkers.map((ms) => {
                    const lineLeftPct = (ms / totalDurationMs) * 100;
                    if (lineLeftPct > 100) return null;
                    return (
                      <div
                        key={ms}
                        className="absolute top-0 bottom-0 w-px bg-border/40 pointer-events-none"
                        style={{ left: `${lineLeftPct}%` }}
                      />
                    );
                  })}

                  {/* Horizontal Span Bar */}
                  <div
                    className={cn(
                      "absolute h-4 rounded transition-all flex items-center px-1.5 shadow-xs",
                      span.kind === "tool" ? "bg-amber-500/80 hover:bg-amber-500" : config.bar,
                      isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-surface"
                    )}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                    title={`${span.name} (${span.durationMs}ms)`}
                  >
                    <span className="font-mono text-[9px] text-white font-bold truncate drop-shadow-xs">
                      {span.durationMs}ms
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
