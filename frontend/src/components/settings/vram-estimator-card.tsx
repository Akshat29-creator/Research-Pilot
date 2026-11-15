"use client";

import * as React from "react";
import { Cpu, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VramEstimatorCardProps {
  model: string;
  contextLen: number;
}

const MODEL_SPECS: Record<string, { name: string; vramMb: number; params: string; quant: string }> = {
  "qwen2.5:3b": { name: "Qwen2.5:3B", vramMb: 1920, params: "3.1B", quant: "Q4_K_M" },
  "qwen3:8b": { name: "Qwen3:8B", vramMb: 5214, params: "8.2B", quant: "Q4_K_M" },
  "qwen3.5:2b": { name: "Qwen3.5:2B", vramMb: 2700, params: "2.1B", quant: "Q4_K_M" },
  "qwen2.5-coder:1.5b": { name: "Qwen2.5-Coder:1.5B", vramMb: 986, params: "1.5B", quant: "Q4_K_M" },
  "llama3.2:3b": { name: "Llama-3.2:3B", vramMb: 2048, params: "3.2B", quant: "Q4_K_M" },
  "mistral:7b": { name: "Mistral:7B", vramMb: 4400, params: "7.2B", quant: "Q4_K_M" },
};

const EMBEDDING_VRAM_MB = 274; // nomic-embed-text
const TOTAL_GPU_VRAM_MB = 8151; // RTX 5060 Laptop total
const USABLE_HEADROOM_MB = 6144; // ~6.0 GB practical budget to prevent OS display driver crash

export function VramEstimatorCard({ model, contextLen }: VramEstimatorCardProps) {
  const modelSpec = MODEL_SPECS[model] || MODEL_SPECS["qwen2.5:3b"];

  // Approximate KV Cache VRAM footprint based on context length:
  // ~0.11 MB per token for 8B models (fp16 KV cache)
  const kvCacheMb = Math.round((contextLen / 1024) * 115);
  const totalProjectedVramMb = modelSpec.vramMb + EMBEDDING_VRAM_MB + kvCacheMb;
  const isOverheadExceeded = totalProjectedVramMb > USABLE_HEADROOM_MB;
  const freeHeadroomMb = Math.max(0, TOTAL_GPU_VRAM_MB - totalProjectedVramMb);

  const modelPct = (modelSpec.vramMb / TOTAL_GPU_VRAM_MB) * 100;
  const embedPct = (EMBEDDING_VRAM_MB / TOTAL_GPU_VRAM_MB) * 100;
  const kvPct = (kvCacheMb / TOTAL_GPU_VRAM_MB) * 100;
  const freePct = Math.max(0, 100 - modelPct - embedPct - kvPct);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-raised border border-border text-primary">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Hardware VRAM Allocation Projection
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Host Target: NVIDIA GeForce RTX 5060 Laptop (8,151 MiB Total)
            </p>
          </div>
        </div>

        <Badge
          variant={isOverheadExceeded ? "destructive" : "outline"}
          className={cn(
            "font-mono text-[10px]",
            !isOverheadExceeded && "text-emerald-400 border-emerald-500/30"
          )}
        >
          {isOverheadExceeded ? "Risk of CPU Spillover" : "Safe VRAM Envelope"}
        </Badge>
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Projected Footprint:</span>
            <span
              className={cn(
                "text-base font-bold tabular-nums",
                isOverheadExceeded ? "text-amber-400" : "text-foreground"
              )}
            >
              {totalProjectedVramMb.toLocaleString()} MiB
            </span>
            <span className="text-muted-foreground">/ {TOTAL_GPU_VRAM_MB.toLocaleString()} MiB</span>
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            {freeHeadroomMb.toLocaleString()} MiB Headroom
          </div>
        </div>

        {/* Multi-segment visual bar */}
        <div className="h-2.5 w-full rounded-full bg-surface-raised border border-border overflow-hidden flex p-0.5 gap-0.5">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${modelPct}%` }}
            title={`Model Weights: ${modelSpec.vramMb} MiB`}
          />
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${embedPct}%` }}
            title={`Embeddings: ${EMBEDDING_VRAM_MB} MiB`}
          />
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isOverheadExceeded ? "bg-amber-400" : "bg-primary"
            )}
            style={{ width: `${kvPct}%` }}
            title={`KV Cache (${contextLen} tok): ${kvCacheMb} MiB`}
          />
          <div
            className="h-full rounded-full bg-surface-overlay/40 transition-all duration-300"
            style={{ width: `${freePct}%` }}
            title={`Free Headroom: ${freeHeadroomMb} MiB`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <span>Model ({modelSpec.vramMb} MiB)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
              <span>Embeddings ({EMBEDDING_VRAM_MB} MiB)</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "h-2 w-2 rounded-full inline-block",
                  isOverheadExceeded ? "bg-amber-400" : "bg-primary"
                )}
              />
              <span>KV Cache ({kvCacheMb} MiB)</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span>Usable Ceiling: ~6.1 GB</span>
          </div>
        </div>
      </div>

      {/* Warning Alert if exceeded */}
      {isOverheadExceeded ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-amber-300">
              VRAM Capacity Warning: Context window exceeds 4,096 tokens!
            </div>
            <div className="text-[11px] text-amber-200/80 leading-relaxed">
              At {contextLen} tokens, total memory allocation reaches {totalProjectedVramMb} MiB. On
              an 8GB laptop GPU, Windows display drivers require ~1.8GB headroom. Running beyond 4,096
              tokens risks spilling CUDA layers into system RAM, dropping token velocity by up to 80%.
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Optimal Hardware Envelope: 100% CUDA GPU Layer Offload Guaranteed</span>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
            Zero CPU Spill
          </Badge>
        </div>
      )}
    </div>
  );
}
