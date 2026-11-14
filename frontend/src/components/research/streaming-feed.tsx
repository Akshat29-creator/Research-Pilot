"use client";

import * as React from "react";
import {
  Terminal,
  Activity,
  Maximize2,
  Minimize2,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface StreamEvent {
  id: string;
  timestamp: string;
  agent: "orchestrator" | "research" | "analysis" | "writer" | "reviewer" | "system";
  type: "tool" | "thought" | "token_chunk" | "status" | "error";
  message: string;
  metadata?: {
    toolName?: string;
    durationMs?: number;
    tokens?: number;
    tokensPerSec?: number;
    rawPayload?: Record<string, unknown>;
  };
}

export interface StreamingFeedProps {
  events?: StreamEvent[];
  isStreaming?: boolean;
  className?: string;
}

export const SAMPLE_STREAM_EVENTS: StreamEvent[] = [
  {
    id: "evt-1",
    timestamp: "19:42:01.104",
    agent: "orchestrator",
    type: "status",
    message: "Decomposed research query into 3 sequential verification targets",
    metadata: {
      durationMs: 412,
      tokens: 295,
      rawPayload: {
        hypotheses: [
          "HNSW graph memory overhead scales O(N*M) with M=16",
          "IVFFlat lists=1000 requires probing nprobe >= 10 for recall > 0.85",
          "PostgreSQL 16 shared_buffers sizing constraints under concurrent vector search",
        ],
        planner_model: "qwen3:8b",
      },
    },
  },
  {
    id: "evt-2",
    timestamp: "19:42:01.520",
    agent: "research",
    type: "tool",
    message: "SearXNG query: pgvector hnsw vs ivfflat memory overhead benchmark postgresql 16",
    metadata: {
      toolName: "SearXNG HTTP :8080",
      durationMs: 780,
      rawPayload: {
        endpoint: "http://127.0.0.1:8080/search",
        hits: 14,
        deduped: 4,
        avg_credibility: 0.89,
      },
    },
  },
  {
    id: "evt-3",
    timestamp: "19:42:02.310",
    agent: "research",
    type: "tool",
    message: "pgvector similarity search over ingested papers (cosine distance < 0.22)",
    metadata: {
      toolName: "pgvector (HNSW Index)",
      durationMs: 64,
      rawPayload: {
        query_vector_dim: 768,
        ef_search: 40,
        matches_returned: 6,
      },
    },
  },
  {
    id: "evt-4",
    timestamp: "19:42:02.400",
    agent: "analysis",
    type: "thought",
    message: "Cross-referencing Claim A (pgvector repo) vs Claim B (EDB technical paper). Resolving contradiction on index build memory.",
    metadata: {
      durationMs: 910,
      tokens: 620,
      tokensPerSec: 36.4,
      rawPayload: {
        contradiction_detected: true,
        resolution: "pgvector 0.5.0+ reduced HNSW build memory by 40% via halfvec support",
      },
    },
  },
  {
    id: "evt-5",
    timestamp: "19:42:03.320",
    agent: "writer",
    type: "token_chunk",
    message: "Synthesizing Section 2: 'Empirical Index Overhead & Query Latency Distributions' [Citation: arXiv:2407.10983v1]",
    metadata: {
      durationMs: 1420,
      tokens: 384,
      tokensPerSec: 38.1,
      rawPayload: {
        active_section: "Architecture Comparison",
        citation_keys: ["arXiv:2407.10983v1", "pgvector_docs_0.7"],
      },
    },
  },
  {
    id: "evt-6",
    timestamp: "19:42:04.750",
    agent: "reviewer",
    type: "status",
    message: "Adversarial Citation Auditor: 8 assertions checked against source spans. 1 requires human corroboration.",
    metadata: {
      durationMs: 490,
      rawPayload: {
        supported_claims: 7,
        unsupported_claims: 1,
        flagged_span: "IVFFlat recall degrades exponentially when dataset exceeds maintenance_work_mem",
      },
    },
  },
];

export function StreamingFeed({
  events = SAMPLE_STREAM_EVENTS,
  isStreaming = true,
  className,
}: StreamingFeedProps) {
  const [filter, setFilter] = React.useState<"all" | "tool" | "thought" | "status">("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const feedEndRef = React.useRef<HTMLDivElement>(null);

  const filteredEvents = React.useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => {
      if (filter === "tool") return e.type === "tool";
      if (filter === "thought") return e.type === "thought" || e.type === "token_chunk";
      if (filter === "status") return e.type === "status" || e.type === "error";
      return true;
    });
  }, [events, filter]);

  React.useEffect(() => {
    if (autoScroll && feedEndRef.current?.scrollIntoView) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredEvents, autoScroll]);

  const handleCopyPayload = (id: string, payload: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getAgentColor = (agent: StreamEvent["agent"]) => {
    switch (agent) {
      case "orchestrator":
        return "text-indigo-400 border-indigo-500/20 bg-indigo-500/10";
      case "research":
        return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
      case "analysis":
        return "text-amber-400 border-amber-500/20 bg-amber-500/10";
      case "writer":
        return "text-sky-400 border-sky-500/20 bg-sky-500/10";
      case "reviewer":
        return "text-rose-400 border-rose-500/20 bg-rose-500/10";
      default:
        return "text-zinc-400 border-zinc-500/20 bg-zinc-500/10";
    }
  };

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-surface shadow-xs overflow-hidden", className)}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground tracking-tight">Agent Execution Feed</span>
          {isStreaming ? (
            <Badge variant="outline" className="gap-1.5 py-0 px-2 text-[10px] font-mono text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE SSE
            </Badge>
          ) : (
            <Badge variant="secondary" className="py-0 px-2 text-[10px] font-mono">
              STANDBY
            </Badge>
          )}
        </div>

        {/* Filters and controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "all" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("tool")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "tool" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tools
            </button>
            <button
              onClick={() => setFilter("thought")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "thought" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tokens
            </button>
            <button
              onClick={() => setFilter("status")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                filter === "status" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Gates
            </button>
          </div>

            <Button
              variant={autoScroll ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? "Disable Auto-scroll" : "Enable Auto-scroll"}
              className="h-7 px-2 text-[11px] gap-1"
            >
              <ArrowDown className={cn("h-3 w-3", autoScroll && "animate-bounce")} />
              <span className="hidden sm:inline">Follow</span>
            </Button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-[11px] max-h-[380px] min-h-[220px] bg-black/40">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
            No events match the selected filter.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <div
                key={evt.id}
                className={cn(
                  "group rounded-md border border-border/40 p-2.5 transition-colors hover:border-border hover:bg-surface/50",
                  evt.type === "error" && "border-rose-500/30 bg-rose-500/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground/70 text-[10px] tabular-nums select-none">
                      {evt.timestamp}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.2 text-[10px] font-semibold border uppercase tracking-wider",
                        getAgentColor(evt.agent)
                      )}
                    >
                      {evt.agent}
                    </span>
                    {evt.metadata?.toolName && (
                      <span className="rounded bg-zinc-800/80 px-1.5 py-0.2 text-[10px] text-zinc-300 border border-zinc-700">
                        {evt.metadata.toolName}
                      </span>
                    )}
                    {evt.metadata?.tokensPerSec && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {evt.metadata.tokensPerSec} tok/s
                      </span>
                    )}
                    {evt.metadata?.durationMs && (
                      <span className="text-[10px] text-muted-foreground">
                        {evt.metadata.durationMs}ms
                      </span>
                    )}
                  </div>

                  {evt.metadata?.rawPayload && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyPayload(evt.id, evt.metadata?.rawPayload)}
                        className="p-1 rounded hover:bg-surface-raised text-muted-foreground hover:text-foreground"
                        title="Copy raw JSON"
                      >
                        {copiedId === evt.id ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                        className="p-1 rounded hover:bg-surface-raised text-muted-foreground hover:text-foreground"
                        title={isExpanded ? "Collapse payload" : "Expand payload"}
                      >
                        {isExpanded ? (
                          <Minimize2 className="h-3 w-3" />
                        ) : (
                          <Maximize2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-1.5 text-foreground/90 leading-relaxed break-words font-sans text-xs">
                  {evt.message}
                </div>

                {isExpanded && evt.metadata?.rawPayload && (
                  <div className="mt-2.5 rounded border border-border/80 bg-zinc-950 p-2.5 text-[10px] font-mono text-zinc-300 overflow-x-auto">
                    <pre className="whitespace-pre">
                      {JSON.stringify(evt.metadata.rawPayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Terminal Footer Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-surface-raised text-[10px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>Concurrency: 1/1 (NVIDIA RTX 5060)</span>
          <span>•</span>
          <span>Model: qwen3:8b Q4_K_M</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-500">
          <Activity className="h-3 w-3" />
          <span>Buffer: In Sync</span>
        </div>
      </div>
    </div>
  );
}
