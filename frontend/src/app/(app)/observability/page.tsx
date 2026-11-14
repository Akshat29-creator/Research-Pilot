"use client";

import * as React from "react";
import { Activity, Cpu, Database, HardDrive, ShieldCheck, Zap } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";

export default function ObservabilityPage() {
  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-[10px]">
            SYSTEM TELEMETRY
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">Live Hardware Probes</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Observability &amp; Hardware Diagnostics
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time metrics, GPU memory headroom, Ollama process health, and LangGraph execution latencies.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="NVIDIA RTX 5060 VRAM"
          value="5,474 MiB"
          subtext="67% allocated (2,677 MiB free)"
          icon={Cpu}
          trend={{ value: "Healthy", isPositive: true }}
        />
        <MetricCard
          label="Context Window Ceiling"
          value="4,096 tok"
          subtext="Enforced num_ctx safety limit"
          icon={Zap}
        />
        <MetricCard
          label="PostgreSQL / pgvector"
          value="Port 5432"
          subtext="HNSW Index active"
          icon={Database}
          trend={{ value: "Connected", isPositive: true }}
        />
        <MetricCard
          label="SearXNG Metasearch"
          value="Port 8080"
          subtext="Zero API cost metasearch"
          icon={HardDrive}
          trend={{ value: "Healthy", isPositive: true }}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Active Hardware Processes (Ollama /api/ps)
          </h3>
          <div className="flex items-center gap-2">
            <StatusDot status="healthy" pulse />
            <span className="font-mono text-xs text-foreground font-semibold">1 Model In VRAM</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] pb-1 border-b border-border/60">
            <span>MODEL IDENTIFIER</span>
            <span>VRAM ALLOCATION</span>
            <span>PRECISION</span>
            <span>STATUS</span>
          </div>
          <div className="flex items-center justify-between text-foreground">
            <span className="font-semibold text-primary">qwen3:8b</span>
            <span className="tabular-nums">5,214 MiB</span>
            <span>Q4_K_M</span>
            <Badge variant="success" className="py-0 text-[10px]">Loaded</Badge>
          </div>
          <div className="flex items-center justify-between text-foreground">
            <span className="font-semibold">nomic-embed-text</span>
            <span className="tabular-nums">274 MiB</span>
            <span>FP16 (768d)</span>
            <Badge variant="success" className="py-0 text-[10px]">Loaded</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
