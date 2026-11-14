"use client";

import * as React from "react";
import { Terminal, Copy, Check, Filter, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SystemLogEvent {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "DEBUG";
  category: "INFERENCE" | "RETRIEVAL" | "SYSTEM" | "REVIEW";
  source: string;
  message: string;
}

const DEFAULT_LOGS: SystemLogEvent[] = [
  {
    id: "log-1",
    timestamp: "16:42:01.104",
    level: "INFO",
    category: "SYSTEM",
    source: "host.gpu",
    message: "RTX 5060 Laptop VRAM verified: 5,488 MiB allocated, 2,663 MiB headroom safe.",
  },
  {
    id: "log-2",
    timestamp: "16:42:02.320",
    level: "INFO",
    category: "INFERENCE",
    source: "ollama.semaphore",
    message: "asyncio.Semaphore(1) acquired for model 'qwen3:8b' (ctx=4096 tok).",
  },
  {
    id: "log-3",
    timestamp: "16:42:04.810",
    level: "INFO",
    category: "RETRIEVAL",
    source: "searxng.client",
    message: "Metasearch query dispatched across Google + ArXiv engines (0.41s latency).",
  },
  {
    id: "log-4",
    timestamp: "16:42:07.450",
    level: "INFO",
    category: "RETRIEVAL",
    source: "pgvector.hnsw",
    message: "Cosine similarity search executed across 172 chunks in 7.2ms (top_k=8).",
  },
  {
    id: "log-5",
    timestamp: "16:42:15.900",
    level: "INFO",
    category: "INFERENCE",
    source: "ollama.generation",
    message: "Streaming synthesis completed: 1,482 tokens @ 27.6 tok/s sustained velocity.",
  },
  {
    id: "log-6",
    timestamp: "16:42:18.210",
    level: "INFO",
    category: "REVIEW",
    source: "adversarial.gate",
    message: "Verdict rendered: APPROVED (grounding: 92%, 11 corroborated assertions).",
  },
  {
    id: "log-7",
    timestamp: "16:42:18.250",
    level: "INFO",
    category: "INFERENCE",
    source: "ollama.semaphore",
    message: "asyncio.Semaphore(1) released. Lock state returned to IDLE.",
  },
];

interface LiveEventStreamProps {
  logs?: SystemLogEvent[];
}

export function LiveEventStream({ logs = DEFAULT_LOGS }: LiveEventStreamProps) {
  const [filter, setFilter] = React.useState<"ALL" | "INFERENCE" | "RETRIEVAL" | "SYSTEM">("ALL");
  const [isPaused, setIsPaused] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const filteredLogs = React.useMemo(() => {
    if (filter === "ALL") return logs;
    return logs.filter((l) => l.category === filter);
  }, [logs, filter]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}]: ${l.message}`)
      .join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Live Diagnostics &amp; OpenTelemetry Event Stream
          </h3>
          <Badge variant="outline" className="text-[10px] py-0">
            {filteredLogs.length} Events
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center rounded-lg border border-border bg-surface-raised p-0.5 text-[10px]">
            {(["ALL", "INFERENCE", "RETRIEVAL", "SYSTEM"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors font-medium",
                  filter === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume stream" : "Pause stream"}
            className="p-1.5 rounded border border-border bg-surface-raised hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </button>

          <button
            onClick={handleCopyLogs}
            title="Copy logs to clipboard"
            className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-surface-raised hover:bg-surface text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{isCopied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div
        ref={scrollRef}
        className="rounded-lg border border-border bg-surface-raised/90 p-3.5 space-y-1.5 max-h-[220px] overflow-y-auto text-xs font-mono select-text"
      >
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-surface/50 p-0.5 rounded">
            <span className="text-muted-foreground text-[10px] tabular-nums shrink-0">
              [{log.timestamp}]
            </span>
            <span
              className={cn(
                "text-[10px] font-bold px-1 rounded shrink-0",
                log.level === "INFO" && "text-emerald-400 bg-emerald-500/10",
                log.level === "WARN" && "text-amber-400 bg-amber-500/10",
                log.level === "DEBUG" && "text-sky-400 bg-sky-500/10"
              )}
            >
              {log.level}
            </span>
            <span className="text-muted-foreground text-[10px] shrink-0">[{log.source}]:</span>
            <span className="text-foreground text-[11px] break-all">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
