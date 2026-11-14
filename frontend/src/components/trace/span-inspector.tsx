"use client";

import * as React from "react";
import {
  Clock,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Tag,
  ArrowRight,
  Maximize2,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { StatusDot } from "@/components/ui/status-dot";
import { TraceSpan } from "@/components/trace/trace-data";

export interface SpanInspectorProps {
  span: TraceSpan | null;
  className?: string;
}

export function SpanInspector({ span, className }: SpanInspectorProps) {
  const [activeTab, setActiveTab] = React.useState<"inputs" | "outputs" | "attributes">("outputs");
  const [copiedId, setCopiedId] = React.useState(false);

  if (!span) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 rounded-xl border border-border bg-surface text-muted-foreground text-xs", className)}>
        <Layers className="h-6 w-6 mb-2 opacity-50" />
        <p>Select any span in the timeline to inspect inputs, outputs, and telemetry.</p>
      </div>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(span.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-surface shadow-xs overflow-hidden", className)}>
      {/* Inspector Header */}
      <div className="p-4 border-b border-border bg-surface-raised space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot
              status={
                span.status === "completed"
                  ? "healthy"
                  : span.status === "running"
                  ? "running"
                  : "failed"
              }
            />
            <h3 className="font-mono text-sm font-bold text-foreground truncate">
              {span.name}
            </h3>
          </div>

          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border bg-surface transition-colors shrink-0"
          >
            {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            <span>{span.id}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
            {span.agent}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {span.kind}
          </Badge>
          <span className="text-muted-foreground">•</span>
          <span className="text-foreground font-semibold">{span.durationMs}ms</span>
          <span className="text-muted-foreground">offset +{span.startTimeMs}ms</span>
          {span.tokens && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-emerald-500 font-semibold">{span.tokens.total} tokens</span>
              {span.tokens.tokPerSec && (
                <span className="text-muted-foreground">({span.tokens.tokPerSec} tok/s)</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hardware & Model Sub-bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border-b border-border bg-surface text-[10px] font-mono">
        <div className="p-2 rounded border border-border bg-surface-raised">
          <span className="text-muted-foreground block text-[9px]">Model</span>
          <span className="text-foreground font-medium">{span.model || "Tool Pipeline"}</span>
        </div>
        <div className="p-2 rounded border border-border bg-surface-raised">
          <span className="text-muted-foreground block text-[9px]">Prompt Tokens</span>
          <span className="text-foreground font-medium">{span.tokens?.prompt ?? "N/A"}</span>
        </div>
        <div className="p-2 rounded border border-border bg-surface-raised">
          <span className="text-muted-foreground block text-[9px]">Completion Tokens</span>
          <span className="text-foreground font-medium">{span.tokens?.completion ?? "N/A"}</span>
        </div>
        <div className="p-2 rounded border border-border bg-surface-raised">
          <span className="text-muted-foreground block text-[9px]">Cost Incurred</span>
          <span className="text-emerald-400 font-bold">$0.00 (Local)</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center px-4 pt-3 border-b border-border bg-surface gap-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab("outputs")}
          className={cn(
            "pb-2 border-b-2 font-medium transition-colors",
            activeTab === "outputs"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Output Payload
        </button>
        <button
          onClick={() => setActiveTab("inputs")}
          className={cn(
            "pb-2 border-b-2 font-medium transition-colors",
            activeTab === "inputs"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Input Payload
        </button>
        <button
          onClick={() => setActiveTab("attributes")}
          className={cn(
            "pb-2 border-b-2 font-medium transition-colors",
            activeTab === "attributes"
              ? "border-primary text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          OpenTelemetry Attributes ({Object.keys(span.attributes).length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 overflow-y-auto max-h-[420px]">
        {activeTab === "outputs" && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-muted-foreground block uppercase tracking-wider">
              Serialized Result Data
            </span>
            <CodeBlock
              code={JSON.stringify(span.outputPayload, null, 2)}
              language="json"
              className="text-xs"
            />
          </div>
        )}

        {activeTab === "inputs" && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-muted-foreground block uppercase tracking-wider">
              Serialized Ingestion Arguments
            </span>
            <CodeBlock
              code={JSON.stringify(span.inputPayload, null, 2)}
              language="json"
              className="text-xs"
            />
          </div>
        )}

        {activeTab === "attributes" && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-muted-foreground block uppercase tracking-wider">
              Key-Value Context Tags
            </span>
            <div className="rounded-lg border border-border overflow-hidden text-xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-surface-raised border-b border-border text-[10px] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Attribute Key</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(span.attributes).map(([k, v]) => (
                    <tr key={k} className="hover:bg-surface-raised/50">
                      <td className="px-3 py-2 text-primary font-semibold">{k}</td>
                      <td className="px-3 py-2 text-foreground/90 break-all">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
