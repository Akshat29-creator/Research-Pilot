"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  FileText,
  History,
  Layers,
  Moon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { CommandPalette } from "@/components/ui/command-palette";
import { Stepper, StepItem } from "@/components/ui/stepper";
import { Timeline, TimelineEntry } from "@/components/ui/timeline";
import { CitationChip, CitationData } from "@/components/ui/citation-chip";
import { SourceCard, SourceCardData } from "@/components/ui/source-card";
import { MetricCard } from "@/components/ui/metric-card";
import { CodeBlock } from "@/components/ui/code-block";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";

interface MockSession extends Record<string, unknown> {
  id: string;
  query: string;
  status: "completed" | "running" | "failed";
  sources: number;
  duration: string;
  timestamp: string;
}

const mockSessions: MockSession[] = [
  {
    id: "sess_01H9A",
    query: "Compare HNSW vs IVFFlat in pgvector with 8GB VRAM limits",
    status: "completed",
    sources: 14,
    duration: "4.2s",
    timestamp: "10 mins ago",
  },
  {
    id: "sess_01H9B",
    query: "LangGraph cyclical review loop bounded convergence guarantees",
    status: "running",
    sources: 6,
    duration: "1.8s",
    timestamp: "Just now",
  },
  {
    id: "sess_01H9C",
    query: "Quantization loss in Qwen3:8B Q4_K_M vs FP16 on scientific reasoning",
    status: "failed",
    sources: 2,
    duration: "0.9s",
    timestamp: "1 hour ago",
  },
];

const mockSteps: StepItem[] = [
  { id: "s1", label: "Orchestrator", state: "completed", duration: "0.3s" },
  { id: "s2", label: "Research Agent", state: "completed", duration: "1.4s" },
  { id: "s3", label: "Analysis Agent", state: "running", duration: "0.8s" },
  { id: "s4", label: "Writer Agent", state: "pending" },
  { id: "s5", label: "Reviewer Agent", state: "pending" },
];

const mockTimeline: TimelineEntry[] = [
  {
    id: "tl_1",
    timestamp: "18:04:12.110",
    agent: "ORCHESTRATOR",
    action: "Plan generated: 3 sub-queries dispatched to SearXNG",
    status: "healthy",
    duration: "240ms",
    tokens: { prompt: 180, completion: 45 },
    details: { subQueries: ["HNSW index build time", "IVFFlat probe trade-off", "pgvector memory buffer"] },
  },
  {
    id: "tl_2",
    timestamp: "18:04:13.520",
    agent: "RESEARCH",
    action: "Dispatched metasearch via SearXNG container (port 8080)",
    status: "healthy",
    duration: "1,410ms",
    tokens: { prompt: 420, completion: 210 },
    details: { engine: "SearXNG", sourcesRetrieved: 5, deduped: 2 },
  },
  {
    id: "tl_3",
    timestamp: "18:04:14.330",
    agent: "ANALYSIS",
    action: "Cross-encoder scoring and contradiction resolution",
    status: "running",
    duration: "810ms",
    details: "Resolving conflicting recall claims between arXiv:1603.09320 and benchmark...",
  },
];

const mockCitation1: CitationData = {
  index: 1,
  title: "Efficient and robust approximate nearest neighbor search using HNSW",
  url: "https://arxiv.org/abs/1603.09320",
  excerpt: "HNSW graphs construct multi-layered proximity structures that achieve logarithmic query scaling while maintaining recall above 98%.",
  credibilityScore: 0.94,
  page: 4,
  hash: "sha256:e3b0c442",
};

const mockCitation2: CitationData = {
  index: 2,
  title: "pgvector: Open-source vector similarity search for Postgres",
  url: "https://github.com/pgvector/pgvector",
  excerpt: "HNSW indexes require substantial maintenance_work_mem during creation. For 1M vectors, build memory exceeds 500MB.",
  credibilityScore: 0.88,
  page: 1,
  hash: "sha256:8f49a21b",
};

const mockSource: SourceCardData = {
  id: "src_1",
  index: 1,
  title: "Hierarchical Navigable Small World (HNSW) Graphs in Production RAG",
  url: "https://arxiv.org/abs/1603.09320",
  domain: "arxiv.org",
  publishDate: "2024-02-15",
  excerpt: "Experimental evaluation confirms sub-linear search time with logarithmic scaling across multi-million dimensional spaces at acceptable VRAM footprints.",
  credibilityScore: 0.94,
  page: 4,
  deduped: true,
};

export default function DevComponentsPage() {
  const { theme, setTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState<SourceCardData | null>(null);

  const columns: Column<MockSession>[] = [
    {
      key: "id",
      header: "Session ID",
      sortable: true,
      className: "w-28",
      render: (row) => (
        <span className="font-mono text-[11px] text-muted-foreground uppercase">{row.id}</span>
      ),
    },
    {
      key: "query",
      header: "Research Topic / Question",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-foreground line-clamp-1">{row.query}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-28",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <StatusDot
            status={row.status === "completed" ? "healthy" : row.status === "running" ? "running" : "failed"}
            pulse={row.status === "running"}
          />
          <span className="capitalize text-[11px] font-mono">{row.status}</span>
        </div>
      ),
    },
    {
      key: "sources",
      header: "Sources",
      sortable: true,
      align: "right",
      className: "w-20",
    },
    {
      key: "duration",
      header: "Duration",
      sortable: true,
      align: "right",
      className: "w-24",
    },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 font-sans">
        {/* Header bar */}
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-[10px]">
                DEVELOPER TOOLING
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">/dev/components</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              ResearchPilot Component System & Design Tokens
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Production-ready, accessible, information-dense SaaS component showcase in all interactive states.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCmdOpen(true)}
              className="gap-2 text-xs"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Command Palette</span>
              <KeyboardShortcut keys={["⌘", "K"]} />
            </Button>

            <Button
              variant="subtle"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle Dark / Light Theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

        <div className="max-w-6xl mx-auto mt-8 space-y-12">
          {/* Section 1: Buttons & Interactive Triggers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                01. Buttons & Variants
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">ButtonProps</span>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <Button variant="default">Primary Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="subtle">Subtle Surface</Button>
              <Button variant="default" loading>
                Saving
              </Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
              <Button variant="default" size="xs">
                Size XS
              </Button>
              <Button variant="default" size="sm">
                Size SM
              </Button>
              <Button variant="default" size="lg">
                Size LG
              </Button>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          {/* Section 2: Form Controls (Input & Select) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                02. Form Controls & Dropdowns
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">Input, Select</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Default Input
                </label>
                <Input placeholder="Search literature or enter question..." />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Error State Input
                </label>
                <Input defaultValue="invalid_token_format" error />
                <span className="text-[10px] text-destructive mt-1 block">
                  Token cannot contain special characters.
                </span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Local Model Select
                </label>
                <Select defaultValue="qwen3:8b">
                  <SelectTrigger>
                    <SelectValue placeholder="Choose Reasoning Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwen3:8b">Qwen3:8B (Q4_K_M, 5.2GB) • Default</SelectItem>
                    <SelectItem value="llama3.2:3b">Llama3.2:3B (Q4_K_M, 2.0GB)</SelectItem>
                    <SelectItem value="mistral:7b">Mistral:7B (Q4_K_M, 4.4GB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Section 3: Telemetry & KPI Metric Cards */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                03. Telemetry & Metric Cards
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">MetricCard (Tabular Nums)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <MetricCard
                label="RTX 5060 VRAM"
                value="5.47 GB"
                subtext="67% of 8.15 GB usable"
                icon={Cpu}
                trend={{ value: "+240MB in run", isPositive: false }}
              />
              <MetricCard
                label="Active Model"
                value="Qwen3:8B"
                subtext="Ollama Local (host:11434)"
                icon={Bot}
              />
              <MetricCard
                label="Search Engine"
                value="SearXNG"
                subtext="Zero API cost (Container)"
                icon={Search}
                trend={{ value: "Healthy (32ms)", isPositive: true }}
              />
              <MetricCard
                label="Hybrid Search"
                value="RRF Fusion"
                subtext="HNSW + tsvector GIN"
                icon={Database}
              />
            </div>
          </section>

          {/* Section 4: Live Agent Stepper & Trace Timeline */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                04. Multi-Agent Pipeline & Execution Trace
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">Stepper, Timeline</span>
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase text-muted-foreground tracking-wider font-mono">
                  Live LangGraph Execution Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Stepper steps={mockSteps} />
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-primary" /> Execution Event Trace (Click row to expand)
                  </h4>
                  <Timeline entries={mockTimeline} />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 5: Grounded Citations & Sources */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                05. Verifiable Grounding & Citation Chips
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">CitationChip, SourceCard</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inline Citation Paragraph Preview */}
              <div className="rounded-lg border border-border bg-surface p-4 text-xs space-y-3 text-left">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Inline Report Body with Verifiable Citations</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Interactive Popovers
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Hierarchical Navigable Small World (HNSW) graphs construct multi-layered proximity
                  graphs that provide logarithmic query scaling while retaining 98%+ recall compared
                  to flat-vector scans
                  <CitationChip citation={mockCitation1} onOpenDrawer={() => setSelectedSource(mockSource)} />.
                  In production deployments utilizing pgvector, memory allocation requires careful tuning
                  during index building
                  <CitationChip citation={mockCitation2} onOpenDrawer={() => setSelectedSource(mockSource)} />,
                  as buffer limits directly impact index construction concurrency.
                </p>
                <div className="text-[11px] text-muted-foreground font-mono pt-2 border-t border-border">
                  Tip: Hover or click on the [1] and [2] chips to inspect the verified excerpts.
                </div>
              </div>

              {/* Source Card Preview */}
              <div>
                <SourceCard source={mockSource} onSelect={(s) => setSelectedSource(s)} />
              </div>
            </div>
          </section>

          {/* Section 6: Data Table (Research Sessions) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                06. Sortable Data Table
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">DataTable&lt;T&gt;</span>
            </div>
            <DataTable
              columns={columns}
              data={mockSessions}
              keyExtractor={(r) => r.id}
              onRowClick={(r) => toast.info(`Selected session: ${r.id}`)}
            />
          </section>

          {/* Section 7: Dialogs, Drawers & Toast Notifications */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                07. Overlays, Sheets & Notifications
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">Dialog, Sheet, Toast (Sonner)</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Dialog Trigger */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Human Approval Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Human-in-the-Loop Review Gate</DialogTitle>
                    <DialogDescription>
                      The Reviewer agent flagged 1 assertion with borderline grounding. Review the passage before continuing.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-3 rounded-md bg-surface-raised border border-border text-xs text-foreground/90 font-mono">
                    Assertion: &ldquo;IVFFlat memory requirement is always 10x lower than HNSW.&rdquo;
                    <div className="text-amber-400 mt-1">Status: Unverified in provided sources.</div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm">
                      Reject Draft
                    </Button>
                    <Button variant="default" size="sm">
                      Approve &amp; Finalize
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Sheet Trigger */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Open Sources Drawer</Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Retrieved Evidence &amp; Sources (14)</SheetTitle>
                    <SheetDescription>
                      All web and PDF references verified against raw text offsets.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
                    <SourceCard source={mockSource} />
                    <SourceCard
                      source={{
                        ...mockSource,
                        id: "src_2",
                        index: 2,
                        title: "PostgreSQL pgvector Architecture & Benchmarks",
                        domain: "postgresql.org",
                        credibilityScore: 0.88,
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Toasts */}
              <Button
                variant="subtle"
                onClick={() => toast.success("Research completed in 4.2s (14 sources cited)")}
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="subtle"
                onClick={() => toast.warning("RTX 5060 free VRAM is below warning threshold (5,400 MB)")}
              >
                Trigger VRAM Warning
              </Button>
              <Button
                variant="subtle"
                onClick={() => toast.error("Ollama connection failed: check host.docker.internal:11434")}
              >
                Trigger Error Toast
              </Button>
            </div>
          </section>

          {/* Section 8: Status Dots & Badges */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                08. Status Indicators & Badges
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">StatusDot, Badge</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-border bg-surface">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <StatusDot status="healthy" /> <span>Healthy</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <StatusDot status="running" pulse /> <span>Running (Active Pulse)</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <StatusDot status="degraded" /> <span>Degraded</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <StatusDot status="failed" /> <span>Failed</span>
              </div>

              <div className="h-4 w-px bg-border mx-2" />

              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">98% Grounded</Badge>
              <Badge variant="warning">Revision Loop 2/3</Badge>
              <Badge variant="destructive">Contradiction Detected</Badge>
              <Badge variant="info">Ollama Qwen3:8B</Badge>
              <Badge variant="outline">Air-Gapped</Badge>
            </div>
          </section>

          {/* Section 9: States (Loading Skeleton, Empty State, Error State) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                09. UI States (Loading, Empty, Error)
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">Skeleton, EmptyState, ErrorState</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Skeleton loading preview */}
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  Loading Skeleton
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <div className="flex items-center gap-2 pt-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>

              {/* Empty state preview */}
              <div>
                <EmptyState
                  icon={BookOpen}
                  title="No Research Reports Yet"
                  description="Submit a question to dispatch the autonomous research graph."
                  suggestions={[
                    "HNSW vs IVFFlat indexing trade-offs in pgvector",
                    "LangGraph bounded review loop convergence",
                  ]}
                  onSelectSuggestion={(q) => toast.info(`Selected query: ${q}`)}
                />
              </div>

              {/* Error state preview */}
              <div>
                <ErrorState
                  title="Ollama Provider Connection Refused"
                  message="Could not reach Ollama at http://127.0.0.1:11434. Verify service is active."
                  details="httpx.ConnectError: [Errno 111] Connection refused on 127.0.0.1:11434\n  at backend/app/services/llm.py:84"
                  onRetry={() => toast.info("Retrying connection probe...")}
                />
              </div>
            </div>
          </section>

          {/* Section 10: Code Block Preview */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                10. Monospace Code Viewer
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">CodeBlock</span>
            </div>
            <CodeBlock
              language="python"
              code={`# Local LangGraph State Machine (Ollama Qwen3:8B on RTX 5060)
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END

class ResearchState(TypedDict):
    query: str
    plan: list[str]
    sources: list[dict]
    draft: str
    verdict: str
    revision_count: int

workflow = StateGraph(ResearchState)
workflow.add_node("orchestrator", orchestrator_agent)
workflow.add_node("research", research_agent)
workflow.add_node("analysis", analysis_agent)
workflow.add_node("writer", writer_agent)
workflow.add_node("reviewer", reviewer_agent)`}
            />
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
