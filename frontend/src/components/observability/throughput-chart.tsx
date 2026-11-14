"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from "recharts";
import { Zap, Database, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ThroughputDataPoint {
  time: string;
  tokenVelocity: number; // tok/s
  vectorLatencyMs: number; // ms
  tokensTotal: number;
}

const DEFAULT_THROUGHPUT_SERIES: ThroughputDataPoint[] = [
  { time: "09:00", tokenVelocity: 26.4, vectorLatencyMs: 7.2, tokensTotal: 124000 },
  { time: "10:00", tokenVelocity: 28.1, vectorLatencyMs: 6.8, tokensTotal: 342000 },
  { time: "11:00", tokenVelocity: 24.8, vectorLatencyMs: 8.5, tokensTotal: 618000 },
  { time: "12:00", tokenVelocity: 27.5, vectorLatencyMs: 6.4, tokensTotal: 840000 },
  { time: "13:00", tokenVelocity: 28.4, vectorLatencyMs: 9.1, tokensTotal: 1240000 },
  { time: "14:00", tokenVelocity: 25.2, vectorLatencyMs: 7.6, tokensTotal: 1780000 },
  { time: "15:00", tokenVelocity: 27.8, vectorLatencyMs: 6.5, tokensTotal: 2240000 },
  { time: "16:00", tokenVelocity: 26.9, vectorLatencyMs: 7.9, tokensTotal: 2856400 },
];

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
}

function CustomThroughputTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-xl font-mono text-xs space-y-1.5 min-w-[180px]">
      <div className="text-[11px] font-semibold text-foreground border-b border-border/80 pb-1">
        Time Window: {label}
      </div>
      {payload.map((entry) => (
        <div key={entry.name || entry.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground uppercase text-[10px]">{entry.name}:</span>
          </div>
          <span className="font-bold text-foreground tabular-nums">
            {entry.value}
            {entry.dataKey === "tokenVelocity" ? " tok/s" : " ms"}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ThroughputChartProps {
  data?: ThroughputDataPoint[];
}

export function ThroughputChart({ data = DEFAULT_THROUGHPUT_SERIES }: ThroughputChartProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const peakVelocity = Math.max(...data.map((d) => d.tokenVelocity));
  const avgVelocity = (
    data.reduce((acc, curr) => acc + curr.tokenVelocity, 0) / data.length
  ).toFixed(1);
  const avgVectorLatency = (
    data.reduce((acc, curr) => acc + curr.vectorLatencyMs, 0) / data.length
  ).toFixed(1);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Inference Throughput &amp; Vector Search Latency
            </h3>
            <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30">
              Zero Spill
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Qwen-3-8B token generation velocity &amp; pgvector HNSW query speed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[11px] gap-1">
            <Zap className="h-3 w-3 text-amber-400" />
            <span>Avg {avgVelocity} tok/s</span>
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px] gap-1">
            <Database className="h-3 w-3 text-primary" />
            <span>Avg {avgVectorLatency} ms</span>
          </Badge>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] w-full pt-2">
        {!isMounted ? (
          <div className="h-full w-full rounded-lg bg-surface-raised/40 animate-pulse flex items-center justify-center text-xs text-muted-foreground font-mono">
            Initializing Telemetry Canvas...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                fontFamily="monospace"
              />
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                unit=" t/s"
                fontFamily="monospace"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                unit=" ms"
                fontFamily="monospace"
              />
              <Tooltip content={<CustomThroughputTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  paddingTop: "8px",
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tokenVelocity"
                name="Token Velocity (tok/s)"
                stroke="#34d399" // emerald-400
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#34d399" }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="vectorLatencyMs"
                name="Vector Search Latency (ms)"
                stroke="#38bdf8" // sky-400
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#38bdf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/80 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-surface-raised/40">
          <div className="text-[10px] text-muted-foreground uppercase">Peak Generation</div>
          <div className="text-sm font-bold text-emerald-400 tabular-nums">{peakVelocity} tok/s</div>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-raised/40">
          <div className="text-[10px] text-muted-foreground uppercase">Sustained Average</div>
          <div className="text-sm font-bold text-foreground tabular-nums">{avgVelocity} tok/s</div>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-raised/40">
          <div className="text-[10px] text-muted-foreground uppercase">HNSW Index Latency</div>
          <div className="text-sm font-bold text-sky-400 tabular-nums">{avgVectorLatency} ms</div>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-raised/40">
          <div className="text-[10px] text-muted-foreground uppercase">Total Tokens Processed</div>
          <div className="text-sm font-bold text-foreground tabular-nums">2,856,400</div>
        </div>
      </div>
    </div>
  );
}
