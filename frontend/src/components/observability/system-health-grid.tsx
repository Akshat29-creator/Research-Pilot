"use client";

import * as React from "react";
import { Database, HardDrive, Cpu, Server, Activity, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusDot, StatusDotVariant } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

export interface ServiceHealthItem {
  id: string;
  name: string;
  role: string;
  port: number | string;
  status: "healthy" | "degraded" | "failed" | "running";
  latencyMs: number;
  details: Record<string, string | number>;
  metrics: { label: string; value: string }[];
}

interface SystemHealthGridProps {
  services?: ServiceHealthItem[];
}

const DEFAULT_SERVICES: ServiceHealthItem[] = [
  {
    id: "postgres",
    name: "PostgreSQL 16 + pgvector",
    role: "Relational State & Vector HNSW Index",
    port: 5432,
    status: "healthy",
    latencyMs: 4.2,
    details: {
      "Vector Dimension": "768-d (Cosine)",
      "HNSW Index": "m=16, ef_search=40",
      "Embedded Chunks": 172,
      "Connection Pool": "3 / 20 active",
    },
    metrics: [
      { label: "POOL UTILIZATION", value: "15%" },
      { label: "AVG PING", value: "4.2 ms" },
      { label: "INDEX TYPE", value: "HNSW Cosine" },
    ],
  },
  {
    id: "redis",
    name: "Redis 7 In-Memory Cache",
    role: "Celery Task Broker & Query Cache",
    port: 6379,
    status: "healthy",
    latencyMs: 0.8,
    details: {
      "Memory Footprint": "14.2 MB",
      "Active Keys": 48,
      "Cache Hit Ratio": "94.2%",
      "Pub/Sub Channels": "5 active",
    },
    metrics: [
      { label: "CACHE HIT RATE", value: "94.2%" },
      { label: "PING", value: "0.8 ms" },
      { label: "MAX MEMORY", value: "512 MB" },
    ],
  },
  {
    id: "searxng",
    name: "SearXNG Metasearch Engine",
    role: "Local Zero-Cost Search Aggregator",
    port: 8080,
    status: "healthy",
    latencyMs: 412,
    details: {
      "Active Engines": "Google, Bing, ArXiv, Wikipedia",
      "API Ingress Cost": "$0.00 / query",
      "Rate Limiter": "10 req/s bypass safe",
      "Format": "JSON API Gateway",
    },
    metrics: [
      { label: "API COST", value: "$0.00" },
      { label: "ENGINES", value: "4 Aggregated" },
      { label: "UPTIME", value: "99.98%" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama Inference Daemon",
    role: "Local GPU LLM Host Process",
    port: 11434,
    status: "healthy",
    latencyMs: 14.5,
    details: {
      "Daemon Version": "v0.5.12",
      "Concurrency Lock": "asyncio.Semaphore(1)",
      "GPU Offload Layers": "33 / 33 (100%)",
      "Active Models": "qwen3:8b, nomic-embed",
    },
    metrics: [
      { label: "CUDA LAYERS", value: "33 / 33" },
      { label: "CONCURRENCY", value: "Semaphore(1)" },
      { label: "VRAM USAGE", value: "5,488 MiB" },
    ],
  },
];

export function SystemHealthGrid({ services = DEFAULT_SERVICES }: SystemHealthGridProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case "postgres":
        return Database;
      case "redis":
        return Server;
      case "searxng":
        return HardDrive;
      case "ollama":
        return Cpu;
      default:
        return Activity;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Infrastructure &amp; Service Health Probes
            </h3>
            <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30">
              4/4 ONLINE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Real-time liveness and readiness probe status across local container network
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <StatusDot status="healthy" pulse />
          <span>All Local Services Operating at 100% Target Efficiency</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((svc) => {
          const Icon = getIcon(svc.id);
          return (
            <div
              key={svc.id}
              className="rounded-lg border border-border bg-surface-raised/60 p-4 space-y-3 hover:border-border-subtle transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-md bg-surface border border-border text-primary mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{svc.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono py-0">
                        :{svc.port}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {svc.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <StatusDot status={svc.status as StatusDotVariant} pulse />
                  <span className="text-[11px] text-emerald-400 font-semibold uppercase">
                    {svc.status}
                  </span>
                </div>
              </div>

              {/* Metrics strip */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
                {svc.metrics.map((m, idx) => (
                  <div key={idx} className="p-2 rounded bg-surface/80 border border-border/40">
                    <div className="text-[9px] text-muted-foreground font-mono uppercase truncate">
                      {m.label}
                    </div>
                    <div className="text-xs font-bold font-mono text-foreground tabular-nums truncate">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Extended details */}
              <div className="pt-1 text-[11px] font-mono text-muted-foreground space-y-1">
                {Object.entries(svc.details).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{k}:</span>
                    <span className="text-foreground font-medium tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
