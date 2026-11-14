"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot, StatusDotVariant } from "@/components/ui/status-dot";

export interface TimelineEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: StatusDotVariant;
  duration?: string;
  tokens?: { prompt: number; completion: number };
  details?: Record<string, unknown> | string;
}

export interface TimelineProps {
  entries: TimelineEntry[];
  className?: string;
}

export function Timeline({ entries, className }: TimelineProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={cn("relative space-y-2 pl-4 border-l border-border", className)}>
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div key={entry.id} className="relative group text-xs">
            {/* Timeline node marker */}
            <div className="absolute -left-[21px] top-1.5">
              <StatusDot status={entry.status} pulse={entry.status === "running"} />
            </div>

            <div
              onClick={() => toggleExpand(entry.id)}
              className="flex items-center justify-between p-2.5 rounded-md border border-border bg-surface hover:bg-surface-hover hover:border-zinc-500 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {entry.timestamp}
                </span>
                <span className="font-semibold text-foreground uppercase tracking-wide text-[11px]">
                  {entry.agent}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-foreground/90 truncate">{entry.action}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {entry.tokens && (
                  <span className="hidden md:inline font-mono text-[10px] text-muted-foreground tabular-nums">
                    {entry.tokens.prompt + entry.tokens.completion} tok
                  </span>
                )}
                {entry.duration && (
                  <span className="font-mono text-[11px] text-primary tabular-nums">
                    {entry.duration}
                  </span>
                )}
                {entry.details && (
                  <span className="text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                )}
              </div>
            </div>

            {isExpanded && entry.details && (
              <div className="mt-1.5 p-3 rounded-md bg-surface-raised border border-border font-mono text-[11px] text-muted-foreground overflow-x-auto">
                {typeof entry.details === "string" ? (
                  entry.details
                ) : (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(entry.details, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
