"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from "recharts";
import { Clock, Layers, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface LatencyTimePoint {
  time: string;
  p50: number;
  p90: number;
  p99: number;
  runCount: number;
}

export interface AgentStageLatency {
  stage: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  color: string;
}

const DEFAULT_WORKFLOW_SERIES: LatencyTimePoint[] = [
  { time: "09:00", p50: 17.2, p90: 25.1, p99: 32.4, runCount: 4 },
  { time: "10:00", p50: 16.8, p90: 24.5, p99: 31.8, runCount: 6 },
  { time: "11:00", p50: 18.5, p90: 27.2, p99: 35.0, runCount: 8 },
  { time: "12:00", p50: 16.1, p90: 23.8, p99: 30.5, runCount: 5 },
  { time: "13:00", p50: 19.4, p90: 28.6, p99: 36.2, runCount: 7 },
  { time: "14:00", p50: 17.9, p90: 26.0, p99: 33.1, runCount: 9 },
  { time: "15:00", p50: 16.4, p90: 24.1, p99: 31.0, runCount: 6 },
  { time: "16:00", p50: 18.2, p90: 27.0, p99: 34.8, runCount: 8 },
];

const DEFAULT_STAGE_BREAKDOWN: AgentStageLatency[] = [
  {
    stage: "Orchestrator Plan",
    avgDuration: 1.2,
    minDuration: 0.8,
    maxDuration: 2.1,
    p95Duration: 1.8,
    color: "hsl(var(--primary))",
  },
  {
    stage: "Web / SearXNG Retrieval",
    avgDuration: 4.8,
    minDuration: 2.4,
    maxDuration: 8.2,
    p95Duration: 6.9,
    color: "#38bdf8", // sky-400
  },
  {
    stage: "Academic & Analysis",
    avgDuration: 8.4,
    minDuration: 4.9,
    maxDuration: 13.5,
    p95Duration: 11.8,
    color: "#a78bfa", // violet-400
  },
  {
    stage: "Synthesis & Writer",
    avgDuration: 14.2,
    minDuration: 9.1,
    maxDuration: 22.4,
    p95Duration: 18.6,
    color: "#34d399", // emerald-400
  },
  {
    stage: "Adversarial Reviewer",
    avgDuration: 3.6,
    minDuration: 1.9,
    maxDuration: 6.8,
    p95Duration: 5.2,
    color: "#fbbf24", // amber-400
  },
];

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
    payload?: any;
  }>;
  label?: string;
}

function CustomPercentileTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-xl font-mono text-xs space-y-1.5 min-w-[170px]">
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
          <span className="font-bold text-foreground tabular-nums">{entry.value}s</span>
        </div>
      ))}
    </div>
  );
}

function CustomStageTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as AgentStageLatency;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3 shadow-xl font-mono text-xs space-y-1.5 min-w-[200px]">
      <div className="text-[11px] font-semibold text-foreground border-b border-border/80 pb-1 flex items-center justify-between">
        <span>{data.stage}</span>
      </div>
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Average:</span>
          <span className="font-bold text-foreground tabular-nums">{data.avgDuration}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">p95 Latency:</span>
          <span className="font-bold text-amber-400 tabular-nums">{data.p95Duration}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Min / Max Range:</span>
          <span className="text-muted-foreground tabular-nums">
            {data.minDuration}s – {data.maxDuration}s
          </span>
        </div>
      </div>
    </div>
  );
}

interface LatencyChartProps {
  workflowData?: LatencyTimePoint[];
  stageData?: AgentStageLatency[];
}

export function LatencyChart({
  workflowData = DEFAULT_WORKFLOW_SERIES,
  stageData = DEFAULT_STAGE_BREAKDOWN,
}: LatencyChartProps) {
  const [activeTab, setActiveTab] = React.useState<"percentiles" | "stages">("percentiles");
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const avgWorkflowP50 = (
    workflowData.reduce((acc, curr) => acc + curr.p50, 0) / workflowData.length
  ).toFixed(1);
  const totalWorkflowAvg = stageData.reduce((acc, curr) => acc + curr.avgDuration, 0).toFixed(1);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Execution Latency &amp; Agent Stage Times
            </h3>
            <Badge variant="outline" className="font-mono text-[10px]">
              p50 / p90 / p99
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Total workflow runtime: ~{totalWorkflowAvg}s end-to-end on local RTX 5060
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center rounded-lg border border-border bg-surface-raised p-0.5 text-xs font-mono">
          <button
            onClick={() => setActiveTab("percentiles")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium",
              activeTab === "percentiles"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3 w-3" />
            <span>Workflow Percentiles</span>
          </button>
          <button
            onClick={() => setActiveTab("stages")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium",
              activeTab === "stages"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3 w-3" />
            <span>Per-Agent Stages</span>
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[280px] w-full pt-2">
        {!isMounted ? (
          <div className="h-full w-full rounded-lg bg-surface-raised/40 animate-pulse flex items-center justify-center text-xs text-muted-foreground font-mono">
            Initializing Telemetry Canvas...
          </div>
        ) : activeTab === "percentiles" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={workflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="p90Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                fontFamily="monospace"
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                unit="s"
                fontFamily="monospace"
              />
              <Tooltip content={<CustomPercentileTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  paddingTop: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="p99"
                name="p99 Latency"
                stroke="#f87171"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="p90"
                name="p90 Latency"
                stroke="#fbbf24"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#p90Grad)"
              />
              <Area
                type="monotone"
                dataKey="p50"
                name="p50 Latency"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#p50Grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stageData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                type="number"
                stroke="#6b7280"
                fontSize={11}
                unit="s"
                fontFamily="monospace"
                tickLine={false}
              />
              <YAxis
                dataKey="stage"
                type="category"
                stroke="#9ca3af"
                fontSize={11}
                fontFamily="monospace"
                tickLine={false}
                width={120}
              />
              <Tooltip content={<CustomStageTooltip />} />
              <Bar
                dataKey="avgDuration"
                name="Avg Duration (s)"
                radius={[0, 4, 4, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono text-muted-foreground border-t border-border/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground font-semibold tabular-nums">{avgWorkflowP50}s</span>
            <span>Avg p50 Duration</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-semibold tabular-nums">14.2s</span>
            <span>Writer (Bottleneck)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold tabular-nums">1.2s</span>
            <span>Fastest (Orchestrator)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-primary text-[11px]">
          <TrendingUp className="h-3 w-3" />
          <span>Optimal Latency Profile</span>
        </div>
      </div>
    </div>
  );
}
