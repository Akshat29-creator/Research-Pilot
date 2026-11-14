"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  FileText,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { AgentGraph } from "@/components/research/agent-graph";
import { StreamingFeed, SAMPLE_STREAM_EVENTS, StreamEvent } from "@/components/research/streaming-feed";
import { SourcesDrawer, SAMPLE_SOURCES } from "@/components/research/sources-drawer";
import { ApprovalModal } from "@/components/research/approval-modal";
import { ErrorState } from "@/components/ui/error-state";
import { toast } from "sonner";

interface PlanStep {
  id: string;
  label: string;
  agent: string;
  status: "pending" | "running" | "completed" | "error";
  duration?: string;
  details: string;
}

export default function ResearchWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = (params?.id as string) || "sess_01JBM8";
  const queryParam = searchParams.get("q");

  const [activeTab, setActiveTab] = React.useState<"workspace" | "plan" | "sources">("workspace");
  const [sessionStatus, setSessionStatus] = React.useState<"running" | "paused" | "awaiting_approval" | "completed" | "error">("awaiting_approval");
  const [activeAgent, setActiveAgent] = React.useState<string>("reviewer");
  const [reviewIteration, setReviewIteration] = React.useState(1);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(34);
  const [isApprovalOpen, setIsApprovalOpen] = React.useState(false);
  const [agentError, setAgentError] = React.useState<string | null>(null);

  const queryText = queryParam || "Empirical memory scaling and recall tradeoffs between HNSW and IVFFlat in pgvector on PostgreSQL 16";

  const [planSteps, setPlanSteps] = React.useState<PlanStep[]>([
    {
      id: "step-1",
      label: "Hypothesis Decomposition",
      agent: "Orchestrator",
      status: "completed",
      duration: "0.4s",
      details: "Formulated 3 research verification vectors: index footprint, latency, and shared buffer contention.",
    },
    {
      id: "step-2",
      label: "SearXNG & Vector Ingestion",
      agent: "Research",
      status: "completed",
      duration: "1.6s",
      details: "Ingested 14 sources; filtered 4 duplicates; verified 6 academic preprints.",
    },
    {
      id: "step-3",
      label: "Contradiction Cross-Check",
      agent: "Analysis",
      status: "completed",
      duration: "0.9s",
      details: "Resolved build memory discrepancy between pgvector 0.5.0 halfvec and pgvector 0.7.0 benchmarks.",
    },
    {
      id: "step-4",
      label: "Report Draft Synthesis",
      agent: "Writer",
      status: "completed",
      duration: "1.4s",
      details: "Compiled executive summary, architecture comparison tables, and benchmark graphs.",
    },
    {
      id: "step-5",
      label: "Adversarial Citation Audit",
      agent: "Reviewer",
      status: "running",
      duration: "0.5s",
      details: "Checking citation offsets against ingested PDFs. 1 unverified deduction flagged for user signoff.",
    },
  ]);

  // Elapsed time counter
  React.useEffect(() => {
    if (sessionStatus !== "running") return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleApprove = () => {
    setIsApprovalOpen(false);
    setSessionStatus("completed");
    setPlanSteps((steps) =>
      steps.map((s) => (s.id === "step-5" ? { ...s, status: "completed", duration: "0.8s" } : s))
    );
    toast.success("Verification approved. Full research report compiled!");
  };

  const handleReject = () => {
    setIsApprovalOpen(false);
    setReviewIteration((prev) => prev + 1);
    setSessionStatus("running");
    setPlanSteps((steps) =>
      steps.map((s) =>
        s.id === "step-4"
          ? { ...s, status: "running", details: `Revision loop ${reviewIteration + 1}: Tightening claim boundaries.` }
          : s.id === "step-5"
          ? { ...s, status: "pending" }
          : s
      )
    );
    toast.info(`Review rejected. Triggered revision loop ${reviewIteration + 1} of 3.`);
  };

  const handleSimulateError = () => {
    if (agentError) {
      setAgentError(null);
      setSessionStatus("running");
      toast.success("Agent recovered and pipeline resumed.");
    } else {
      setAgentError("Analysis agent: SearXNG container socket timeout on search retry #2");
      setSessionStatus("error");
      toast.error("Simulated failure injected into Analysis agent node.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Top Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-foreground">{sessionId}</span>
            <Badge
              variant={
                sessionStatus === "completed"
                  ? "success"
                  : sessionStatus === "awaiting_approval"
                  ? "warning"
                  : sessionStatus === "error"
                  ? "destructive"
                  : "default"
              }
              className="font-mono text-[10px] uppercase"
            >
              {sessionStatus === "awaiting_approval" ? "Action Required" : sessionStatus}
            </Badge>
          </div>

          <span className="text-muted-foreground hidden md:inline">•</span>

          <p className="text-xs text-muted-foreground truncate max-w-md hidden md:block">
            {queryText}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {sessionStatus === "awaiting_approval" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsApprovalOpen(true)}
              className="h-8 gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-xs animate-pulse"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Review Checkpoint</span>
            </Button>
          )}

          <Link href={`/research/${sessionId}/trace`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px] font-mono gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Layers className="h-3 w-3 text-primary" />
              <span>Agent Trace</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateError}
            className="h-8 text-[11px] font-mono gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("h-3 w-3", agentError && "text-rose-500 animate-spin")} />
            <span>{agentError ? "Recover Agent" : "Test Fault"}</span>
          </Button>

          {sessionStatus === "completed" && (
            <Link href={`/reports/${sessionId}`}>
              <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                <FileText className="h-3.5 w-3.5" />
                <span>View Final Report</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible on < 1024px) */}
      <div className="lg:hidden flex border-b border-border bg-surface px-4 py-1.5 gap-2 shrink-0 text-xs font-mono">
        <button
          onClick={() => setActiveTab("workspace")}
          className={cn(
            "flex-1 py-1 px-2 rounded text-center transition-colors",
            activeTab === "workspace" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Graph & Stream
        </button>
        <button
          onClick={() => setActiveTab("plan")}
          className={cn(
            "flex-1 py-1 px-2 rounded text-center transition-colors",
            activeTab === "plan" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Plan (5)
        </button>
        <button
          onClick={() => setActiveTab("sources")}
          className={cn(
            "flex-1 py-1 px-2 rounded text-center transition-colors",
            activeTab === "sources" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sources ({SAMPLE_SOURCES.length})
        </button>
      </div>

      {/* Three-Panel Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* =========================================================================
            LEFT PANEL: Query Context, Dynamic Plan Checklist, Hardware Telemetry
            (Hidden on mobile when tab != "plan")
           ========================================================================= */}
        <aside
          className={cn(
            "w-full lg:w-80 xl:w-84 border-r border-border bg-surface flex flex-col shrink-0 overflow-y-auto",
            activeTab !== "plan" && "hidden lg:flex"
          )}
        >
          <div className="p-4 space-y-4">
            {/* Inquiry Target Card */}
            <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                  Research Inquiry
                </span>
                <span className="flex items-center gap-1 text-emerald-500">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums font-bold">{formatTimer(elapsedSeconds)}</span>
                </span>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {queryText}
              </p>
            </div>

            {/* Hardware & Concurrency Telemetry */}
            <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-primary" />
                  Inference Device
                </span>
                <span className="text-foreground font-semibold">NVIDIA RTX 5060</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Model Target</span>
                <span className="text-foreground">qwen3:8b (5.2GB)</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Semaphore Lock</span>
                <span className="text-emerald-500 font-semibold">1/1 Active</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Total Incurred Cost</span>
                <span className="text-emerald-400 font-bold">$0.00 (Local Free)</span>
              </div>
            </div>

            {/* Dynamic Plan Checklist */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Execution Plan (5 Steps)
                </h4>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Loop: {reviewIteration}/3
                </span>
              </div>

              <div className="space-y-2">
                {planSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-lg border p-2.5 text-xs transition-colors",
                      step.status === "running" && "border-primary/40 bg-primary/5 shadow-xs",
                      step.status === "completed" && "border-border bg-surface-raised text-foreground",
                      step.status === "error" && "border-rose-500/40 bg-rose-500/5",
                      step.status === "pending" && "border-border/40 text-muted-foreground bg-surface/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <StatusDot
                          status={
                            step.status === "completed"
                              ? "healthy"
                              : step.status === "running"
                              ? "running"
                              : step.status === "error"
                              ? "failed"
                              : "idle"
                          }
                          pulse={step.status === "running"}
                        />
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          {idx + 1}. {step.label}
                        </span>
                      </div>
                      {step.duration && (
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {step.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight pl-4">
                      {step.details}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            CENTER PANEL: Live Agent Graph (React Flow) + Real-time Streaming Feed
            (Hidden on mobile when tab != "workspace")
           ========================================================================= */}
        <main
          className={cn(
            "flex-1 flex flex-col min-w-0 overflow-y-auto bg-background p-4 gap-4",
            activeTab !== "workspace" && "hidden lg:flex"
          )}
        >
          {/* Active Approval Banner if awaiting human signoff */}
          {sessionStatus === "awaiting_approval" && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Human-in-the-Loop Gate Paused Synthesis
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Reviewer detected 1 unverified deduction in Section 3. Confirm to proceed or reject to iterate.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  className="h-8 text-xs flex-1 sm:flex-initial"
                >
                  Reject & Revise
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApprove}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex-1 sm:flex-initial"
                >
                  Approve Claim
                </Button>
              </div>
            </div>
          )}

          {/* Agent Error State Banner (resilience boundary) */}
          {agentError && (
            <div className="shrink-0">
              <ErrorState
                title="Analysis Agent Execution Failure"
                message={agentError}
                onRetry={handleSimulateError}
                className="py-4 border-rose-500/40 bg-rose-500/5"
              />
            </div>
          )}

          {/* React Flow Agent Graph Card */}
          <div className="rounded-xl border border-border bg-surface shadow-xs flex flex-col overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-raised">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  LangGraph Multi-Agent Topology
                </span>
                <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface border border-border">
                  Active: {activeAgent.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <span>Revision Loop:</span>
                <span className="font-bold text-amber-500">
                  {reviewIteration} / 3 Max
                </span>
              </div>
            </div>

            {/* React Flow Graph Canvas */}
            <div className="h-[280px] w-full bg-background/50">
              <AgentGraph
                activeStep={activeAgent}
                reviewIteration={reviewIteration}
                onNodeClick={(id) => {
                  setActiveAgent(id);
                  toast.info(`Inspecting telemetry for agent: ${id.toUpperCase()}`);
                }}
              />
            </div>
          </div>

          {/* Terminal-style Real-time Streaming Feed */}
          <div className="flex-1 min-h-[300px]">
            <StreamingFeed isStreaming={sessionStatus === "running" || sessionStatus === "awaiting_approval"} />
          </div>
        </main>

        {/* =========================================================================
            RIGHT PANEL: Ingested Sources Drawer with Credibility & Deduplication
            (Hidden on mobile when tab != "sources")
           ========================================================================= */}
        <aside
          className={cn(
            "w-full lg:w-88 xl:w-96 border-l border-border bg-surface shrink-0 overflow-hidden flex flex-col",
            activeTab !== "sources" && "hidden lg:flex"
          )}
        >
          <SourcesDrawer sources={SAMPLE_SOURCES} />
        </aside>
      </div>

      {/* Human Approval Modal */}
      <ApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        flaggedClaim={{
          section: "Section 3: Empirical Index Overhead & Sizing",
          claimText: "IVFFlat recall degrades exponentially when dataset exceeds maintenance_work_mem by more than 4x.",
          reason: "Claim lacks a primary benchmark citation or mathematical proof in the ingested 14 sources. It appears to be an inferred generalization.",
          sourceSuggestion: "Zhang & Mehta (2024) tested up to 2x maintenance_work_mem only.",
          iteration: reviewIteration,
          maxIterations: 3,
        }}
      />
    </div>
  );
}
