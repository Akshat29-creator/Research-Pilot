"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  Cpu,
  Database,
  Layers,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { healthApi } from "@/lib/api";
import { ReadyResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const [readyInfo, setReadyInfo] = useState<ReadyResponse | null>(null);
  const [researchQuery, setResearchQuery] = useState("");

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await healthApi.getReady();
        setReadyInfo(data);
      } catch {
        // Non-blocking
      }
    };
    fetchHealth();
  }, []);

  const handleStartResearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim()) return;
    toast.info(`Preparing multi-agent research run: "${researchQuery}"`);
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Research Workspace
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Autonomous multi-agent investigations grounded in verified academic literature and on-device data.
          </p>
        </div>

        <Button
          onClick={() => router.push("/research/new")}
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Investigation</span>
        </Button>
      </div>

      {/* Start New Research Prompt Card */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> Start New Research Query
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            Model: Qwen3:8B (Local GPU)
          </span>
        </div>

        <form onSubmit={handleStartResearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              placeholder="e.g. Compare HNSW vs IVFFlat indexing in pgvector with memory limits..."
              className="pl-9 h-10 text-xs"
            />
          </div>
          <Button
            type="submit"
            disabled={!researchQuery.trim()}
            className="h-10 px-5 gap-1.5 whitespace-nowrap text-xs font-semibold"
          >
            <span>Launch Pilot</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>

      {/* Telemetry & System Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Database & Vector Engine"
          value="PostgreSQL 16"
          subtext="pgvector HNSW extension active"
          icon={Database}
          trend={{ value: "Healthy", isPositive: true }}
        />
        <MetricCard
          label="Primary Reasoning LLM"
          value="Qwen3:8B"
          subtext="Ollama Q4_K_M (Local GPU)"
          icon={Cpu}
          trend={{ value: "5.2 GB VRAM", isPositive: true }}
        />
        <MetricCard
          label="Search Engine"
          value="SearXNG"
          subtext="Local metasearch container:8080"
          icon={Search}
          trend={{ value: "Zero Cost", isPositive: true }}
        />
        <MetricCard
          label="Multi-Agent Concurrency"
          value="1 Agent"
          subtext="asyncio.Semaphore(1) safe limit"
          icon={Bot}
          trend={{ value: "RTX 5060 Safe", isPositive: true }}
        />
      </div>

      {/* Recent Sessions Box */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Recent Research Sessions
          </h3>
          <span className="font-mono text-[11px] text-muted-foreground">0 active runs</span>
        </div>

        <div className="pt-6">
          <EmptyState
            icon={Layers}
            title="No Research Investigations Yet"
            description="Submit your first inquiry above to dispatch the Orchestrator, Research, and Analysis agents."
            suggestions={[
              "Compare HNSW vs IVFFlat indexing in pgvector with memory limits",
              "LangGraph cyclical review loop bounded convergence guarantees",
              "Local quantization loss in Qwen3:8B on scientific evaluation benchmarks",
            ]}
            onSelectSuggestion={(q) => setResearchQuery(q)}
          />
        </div>
      </div>
    </div>
  );
}
