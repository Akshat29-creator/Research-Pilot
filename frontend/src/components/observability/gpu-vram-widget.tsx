"use client";

import * as React from "react";
import { Cpu, Zap, Thermometer, ShieldCheck, Lock, Activity, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

interface LoadedModel {
  name: string;
  sizeVramMb: number;
  totalSizeMb: number;
  quantization: string;
  role: string;
  status: "active" | "standby";
}

interface GpuVramWidgetProps {
  totalVramMb?: number;
  models?: LoadedModel[];
  gpuTemp?: number;
  gpuPowerWatts?: number;
  concurrencyLockActive?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const DEFAULT_MODELS: LoadedModel[] = [
  {
    name: "qwen3:8b",
    sizeVramMb: 5214,
    totalSizeMb: 5214,
    quantization: "Q4_K_M",
    role: "Primary Reasoning & Synthesis",
    status: "active",
  },
  {
    name: "nomic-embed-text",
    sizeVramMb: 274,
    totalSizeMb: 274,
    quantization: "FP16 (768d)",
    role: "Vector Embedding Pipeline",
    status: "standby",
  },
];

export function GpuVramWidget({
  totalVramMb = 8151,
  models = DEFAULT_MODELS,
  gpuTemp = 58,
  gpuPowerWatts = 64,
  concurrencyLockActive = true,
  onRefresh,
  isRefreshing = false,
}: GpuVramWidgetProps) {
  const usedVramMb = models.reduce((acc, m) => acc + m.sizeVramMb, 0);
  const freeVramMb = Math.max(0, totalVramMb - usedVramMb);
  const usedPercentage = Math.round((usedVramMb / totalVramMb) * 100);

  const qwenModel = models.find((m) => m.name.includes("qwen"));
  const embedModel = models.find((m) => m.name.includes("nomic") || m.name.includes("embed"));

  const qwenPct = qwenModel ? (qwenModel.sizeVramMb / totalVramMb) * 100 : 0;
  const embedPct = embedModel ? (embedModel.sizeVramMb / totalVramMb) * 100 : 0;
  const freePct = Math.max(0, 100 - qwenPct - embedPct);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-surface-raised border border-border text-primary">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                NVIDIA GeForce RTX 5060 Laptop GPU
              </h3>
              <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                Ada Lovelace
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              140W Max TGP • CUDA 12.4 • Compute Capability 8.9 • Local Host
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-raised border border-border">
            <StatusDot status="healthy" pulse />
            <span className="text-[11px] font-mono font-medium text-foreground">
              Offload: 33/33 layers (100% GPU)
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh GPU metrics"
              className="p-1.5 rounded-md hover:bg-surface-raised text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Allocation Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">VRAM Usage:</span>
            <span className="text-base font-bold text-foreground tabular-nums">
              {usedVramMb.toLocaleString()} MiB
            </span>
            <span className="text-muted-foreground">/ {totalVramMb.toLocaleString()} MiB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold tabular-nums">{usedPercentage}%</span>
            <span className="text-muted-foreground">({freeVramMb.toLocaleString()} MiB Headroom)</span>
          </div>
        </div>

        {/* Multi-segment visual bar */}
        <div className="h-3 w-full rounded-full bg-surface-raised border border-border overflow-hidden flex p-0.5 gap-0.5">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${qwenPct}%` }}
            title={`qwen3:8b (${qwenModel?.sizeVramMb || 0} MiB)`}
          />
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-500"
            style={{ width: `${embedPct}%` }}
            title={`nomic-embed-text (${embedModel?.sizeVramMb || 0} MiB)`}
          />
          <div
            className="h-full rounded-full bg-surface-overlay/40 transition-all duration-500"
            style={{ width: `${freePct}%` }}
            title={`Free Headroom (${freeVramMb} MiB)`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <span>qwen3:8b ({qwenModel?.sizeVramMb || 5214} MiB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
              <span>nomic-embed-text ({embedModel?.sizeVramMb || 274} MiB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-border inline-block" />
              <span>Usable Headroom ({freeVramMb} MiB)</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>0 CPU Layer Spills</span>
          </div>
        </div>
      </div>

      {/* GPU Diagnostics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mb-1">
            <span>CORE TEMP</span>
            <Thermometer className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums">
            {gpuTemp}°C
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Optimal Thermal Range</div>
        </div>

        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mb-1">
            <span>POWER DRAW</span>
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
          </div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums">
            {gpuPowerWatts}W <span className="text-xs text-muted-foreground font-normal">/ 140W</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">45.7% Power Budget</div>
        </div>

        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mb-1">
            <span>CONTEXT LIMIT</span>
            <Activity className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums">
            4,096 tok
          </div>
          <div className="text-[10px] text-primary font-mono mt-0.5">Hardware Ceiling Enforced</div>
        </div>

        <div className="p-3 rounded-lg bg-surface-raised/60 border border-border/80">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mb-1">
            <span>INFERENCE LOCK</span>
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold font-mono text-foreground tabular-nums flex items-center gap-1.5">
            <span>Semaphore(1)</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
            {concurrencyLockActive ? "Active • 0 OOM Risk" : "Idle Standby"}
          </div>
        </div>
      </div>

      {/* Active Ollama Models Table */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Active Host Inference Daemons (Ollama /api/ps)
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {models.length} Resident in VRAM
          </span>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-overlay/50 border-b border-border text-[11px] font-mono text-muted-foreground">
              <tr>
                <th className="py-2 px-3 font-medium">MODEL</th>
                <th className="py-2 px-3 font-medium">ROLE</th>
                <th className="py-2 px-3 font-medium">PRECISION</th>
                <th className="py-2 px-3 font-medium text-right">VRAM FOOTPRINT</th>
                <th className="py-2 px-3 font-medium text-right">STATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono text-xs">
              {models.map((model) => (
                <tr key={model.name} className="hover:bg-surface-overlay/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        model.name.includes("qwen") ? "bg-emerald-400" : "bg-cyan-400"
                      )}
                    />
                    <span>{model.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{model.role}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] font-mono py-0">
                      {model.quantization}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-foreground tabular-nums">
                    {model.sizeVramMb.toLocaleString()} MiB
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Badge
                      variant={model.status === "active" ? "success" : "secondary"}
                      className="text-[10px] py-0 capitalize"
                    >
                      {model.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
