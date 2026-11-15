"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Cpu,
  Layers,
  Search,
  Filter,
  Copy,
  Check,
  Download,
  FileCode,
  FileText,
  ChevronRight,
  ExternalLink,
  Bot,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GanttTimeline } from "@/components/trace/gantt-timeline";
import { SpanInspector } from "@/components/trace/span-inspector";
import { SAMPLE_TRACE, TraceSpan } from "@/components/trace/trace-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CodeBlock } from "@/components/ui/code-block";
import { toast } from "sonner";
import { researchApi } from "@/lib/api";
import { TraceExecution } from "@/components/trace/trace-data";

export default function AgentTracePage() {
  const params = useParams();
  const sessionId = (params?.id as string) || "sess_01JBM8";

  const [trace, setTrace] = React.useState<TraceExecution>(SAMPLE_TRACE);
  const [selectedSpan, setSelectedSpan] = React.useState<TraceSpan | null>(SAMPLE_TRACE.spans[0]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [agentFilter, setAgentFilter] = React.useState<string>("all");
  const [kindFilter, setKindFilter] = React.useState<"all" | "agent" | "tool">("all");
  const [isJsonModalOpen, setIsJsonModalOpen] = React.useState(false);
  const [copiedExecId, setCopiedExecId] = React.useState(false);

  React.useEffect(() => {
    if (!sessionId || sessionId.startsWith("sess_")) return;

    researchApi
      .getSession(sessionId)
      .then((detail) => {
        if (detail) {
          setTrace((prev) => ({
            ...prev,
            sessionId: detail.id,
            executionId: `exec_${detail.id.replace(/-/g, "").slice(0, 16)}`,
            query: detail.initial_query || detail.title || prev.query,
            startTime: detail.created_at || prev.startTime,
            endTime: detail.updated_at || prev.endTime,
          }));
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Filter spans
  const filteredSpans = React.useMemo(() => {
    return trace.spans.filter((span) => {
      // Agent filter
      if (agentFilter !== "all" && span.agent !== agentFilter) return false;

      // Kind filter
      if (kindFilter !== "all" && span.kind !== kindFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          span.name.toLowerCase().includes(q) ||
          span.id.toLowerCase().includes(q) ||
          span.agent.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [trace.spans, agentFilter, kindFilter, searchQuery]);

  const handleCopyExecId = () => {
    navigator.clipboard.writeText(trace.executionId);
    setCopiedExecId(true);
    toast.success("Copied Execution ID to clipboard");
    setTimeout(() => setCopiedExecId(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-${trace.executionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded trace JSON payload");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Top Header Cockpit */}
      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/research/${sessionId}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Workspace ({sessionId})</span>
              </Link>
              <span className="text-muted-foreground text-xs">•</span>
              <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
                OPENTELEMETRY TRACE
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Execution Trace Inspector
              </h1>
              <button
                onClick={handleCopyExecId}
                className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded border border-border bg-surface-raised hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                title="Click to copy Execution ID"
              >
                {copiedExecId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{trace.executionId}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsJsonModalOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <FileCode className="h-3.5 w-3.5 text-primary" />
              <span>Raw OTel JSON</span>
            </Button>

            <Link href={`/research/${sessionId}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <span>View Workspace</span>
              </Button>
            </Link>

            <Link href={`/reports/${sessionId}`}>
              <Button size="sm" className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white">
                <FileText className="h-3.5 w-3.5" />
                <span>Final Report</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-border/80 text-[11px] font-mono">
          <div className="flex items-center gap-2 p-2 rounded border border-border/60 bg-surface-raised/40">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <span className="text-muted-foreground text-[10px] block">Duration</span>
              <span className="font-semibold text-foreground">
                {trace.totalDurationMs}ms ({(trace.totalDurationMs / 1000).toFixed(2)}s)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded border border-border/60 bg-surface-raised/40">
            <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <div>
              <span className="text-muted-foreground text-[10px] block">Total Tokens</span>
              <span className="font-semibold text-foreground">
                {trace.totalTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded border border-border/60 bg-surface-raised/40">
            <Cpu className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <div>
              <span className="text-muted-foreground text-[10px] block">Inference Device</span>
              <span className="font-semibold text-foreground">Local RTX 5060 ($0.00)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded border border-border/60 bg-surface-raised/40">
            <Layers className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <div>
              <span className="text-muted-foreground text-[10px] block">Total Spans</span>
              <span className="font-semibold text-foreground">{trace.spans.length} spans</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-2.5 sm:px-6 border-b border-border bg-surface-raised/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Agent Pills */}
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-mono">
            {["all", "orchestrator", "research", "analysis", "writer", "reviewer"].map((agent) => (
              <button
                key={agent}
                onClick={() => setAgentFilter(agent)}
                className={cn(
                  "px-2 py-0.5 rounded capitalize transition-colors text-[11px]",
                  agentFilter === agent
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {agent}
              </button>
            ))}
          </div>

          {/* Kind Pills */}
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-mono">
            <button
              onClick={() => setKindFilter("all")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors text-[11px]",
                kindFilter === "all" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Types
            </button>
            <button
              onClick={() => setKindFilter("agent")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors text-[11px]",
                kindFilter === "agent" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Agents
            </button>
            <button
              onClick={() => setKindFilter("tool")}
              className={cn(
                "px-2 py-0.5 rounded transition-colors text-[11px]",
                kindFilter === "tool" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tools
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spans by name or ID..."
            className="h-8 pl-8 text-xs font-mono bg-surface"
          />
        </div>
      </div>

      {/* Main Content: Gantt + Span Inspector */}
      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Visual Gantt Chart */}
        <GanttTimeline
          spans={filteredSpans}
          totalDurationMs={trace.totalDurationMs}
          selectedSpanId={selectedSpan?.id || null}
          onSelectSpan={(span) => setSelectedSpan(span)}
        />

        {/* Span Detail Inspector */}
        <SpanInspector span={selectedSpan} />
      </div>

      {/* Raw OpenTelemetry JSON Modal */}
      <Dialog open={isJsonModalOpen} onOpenChange={setIsJsonModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-[10px]">
                OPENTELEMETRY TRACE PAYLOAD
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {trace.executionId}
              </span>
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Raw Trace Specification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Complete OpenTelemetry structured span telemetry conforming to W3C Trace Context and OTel GenAI semantic conventions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground">
                Size: ~{Math.round(JSON.stringify(trace).length / 1024)} KB
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadJson}
                className="gap-1.5 text-xs h-7"
              >
                <Download className="h-3 w-3" />
                <span>Download .json</span>
              </Button>
            </div>

            <div className="max-h-[460px] overflow-y-auto rounded-lg border border-border">
              <CodeBlock
                code={JSON.stringify(trace, null, 2)}
                language="json"
                className="text-xs"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
