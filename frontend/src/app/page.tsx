"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  Github,
  HardDrive,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";

const exampleQueries = [
  "HNSW vs IVFFlat memory scaling & recall trade-offs in pgvector",
  "LangGraph cyclical review loop bounded convergence guarantees",
  "Quantization loss in Qwen3:8B Q4_K_M vs FP16 on scientific reasoning",
  "RRF vs Cross-Encoder reranking latency in hybrid retrieval",
];

export default function LandingPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const encoded = encodeURIComponent(query.trim());
    router.push(`/dashboard?q=${encoded}`);
  };

  const handleSelectQuery = (selected: string) => {
    setQuery(selected);
    const encoded = encodeURIComponent(selected);
    router.push(`/dashboard?q=${encoded}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans">
      {/* Top Navigation */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                RP
              </div>
              <span className="font-semibold tracking-tight text-sm text-foreground">
                ResearchPilot AI
              </span>
            </Link>
            <span className="hidden sm:inline-block h-3.5 w-px bg-border" />
            <Badge variant="outline" className="hidden sm:inline-flex font-mono text-[10px] text-muted-foreground gap-1.5">
              <StatusDot status="healthy" pulse /> RTX 5060 • Local
            </Badge>
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild variant="ghost" size="xs" className="hidden md:inline-flex text-muted-foreground">
              <Link href="/dev/components">UI Components</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button asChild variant="outline" size="xs">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="default" size="xs">
              <Link href="/dashboard">Launch Workspace</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-16 pb-20 space-y-16">
        <div className="space-y-6 text-left max-w-4xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-surface-raised text-muted-foreground text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span>100% On-Device • NVIDIA RTX 5060 (8GB VRAM) • Air-Gapped Privacy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
            Autonomous Research with{" "}
            <span className="text-primary underline decoration-primary/40 underline-offset-4">
              Verifiable Grounding
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Formulate complex research questions. Coordinated LangGraph agents search the web via SearXNG and local PDFs, synthesize evidence, resolve contradictions, and compile cited, reviewed reports—100% locally on your laptop with zero cloud costs.
          </p>

          {/* Real Research Input Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="rounded-xl border border-border bg-surface p-3 shadow-sm hover:border-zinc-500 transition-colors focus-within:border-primary/50"
          >
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <div className="flex items-center gap-2.5 flex-1 px-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a technical or scientific inquiry (e.g. Compare HNSW vs IVFFlat memory scaling in pgvector)..."
                  className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none font-sans"
                />
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                <KeyboardShortcut keys={["↵"]} className="hidden sm:inline-flex" />
                <Button type="submit" disabled={!query.trim()} size="sm" className="gap-1.5 text-xs font-semibold">
                  <span>Start Pilot</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </form>

          {/* Example Research Prompts */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
              Or explore deep benchmark prompts (1-click run):
            </span>
            <div className="flex flex-wrap gap-2">
              {exampleQueries.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuery(q)}
                  className="text-left text-xs px-2.5 py-1.5 rounded-md bg-surface-raised border border-border text-foreground hover:border-zinc-500 hover:bg-surface-hover transition-colors truncate max-w-md"
                >
                  &ldquo;{q}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Pipeline Architecture (SVG Diagram) */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-[10px]">
                  STATE GRAPH TOPOLOGY
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">LangGraph Checkpointer</span>
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                The Multi-Agent Research Pipeline
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <StatusDot status="healthy" pulse />
              <span>Bounded Review Loop: Max 3 Iterations</span>
            </div>
          </div>

          {/* Clean SVG Graph Diagram */}
          <div className="overflow-x-auto py-4">
            <svg
              viewBox="0 0 900 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full min-w-[760px] text-foreground"
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="currentColor" opacity="0.4" />
                </marker>
                <marker
                  id="arrow-accent"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
                </marker>
              </defs>

              {/* Connecting forward paths */}
              <path d="M 160 80 L 190 80" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 330 80 L 360 80" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 500 80 L 530 80" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" markerEnd="url(#arrow)" />
              <path d="M 670 80 L 700 80" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Bounded Review Loop Arrow (Reviewer -> Writer) */}
              <path
                d="M 770 120 C 770 160, 600 160, 600 120"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
                markerEnd="url(#arrow-accent)"
              />
              <text x="685" y="152" fill="#10b981" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Revision Loop (Max 3)
              </text>

              {/* Node 1: Orchestrator */}
              <g transform="translate(20, 40)">
                <rect width="140" height="80" rx="8" fill="var(--bg-surface-raised)" stroke="var(--border-subtle)" strokeWidth="1" />
                <circle cx="20" cy="24" r="4" fill="#38bdf8" />
                <text x="32" y="28" fill="currentColor" fontSize="11" fontWeight="600">ORCHESTRATOR</text>
                <text x="16" y="48" fill="var(--text-muted)" fontSize="9">Hypothesis Plan</text>
                <text x="16" y="62" fill="var(--text-muted)" fontSize="9">Sub-query Synthesis</text>
              </g>

              {/* Node 2: Research */}
              <g transform="translate(190, 40)">
                <rect width="140" height="80" rx="8" fill="var(--bg-surface-raised)" stroke="var(--border-subtle)" strokeWidth="1" />
                <circle cx="20" cy="24" r="4" fill="#a855f7" />
                <text x="32" y="28" fill="currentColor" fontSize="11" fontWeight="600">RESEARCH</text>
                <text x="16" y="48" fill="var(--text-muted)" fontSize="9">SearXNG Container</text>
                <text x="16" y="62" fill="var(--text-muted)" fontSize="9">PyMuPDF Ingestion</text>
              </g>

              {/* Node 3: Analysis */}
              <g transform="translate(360, 40)">
                <rect width="140" height="80" rx="8" fill="var(--bg-surface-raised)" stroke="var(--border-subtle)" strokeWidth="1" />
                <circle cx="20" cy="24" r="4" fill="#f59e0b" />
                <text x="32" y="28" fill="currentColor" fontSize="11" fontWeight="600">ANALYSIS</text>
                <text x="16" y="48" fill="var(--text-muted)" fontSize="9">Contradiction Filter</text>
                <text x="16" y="62" fill="var(--text-muted)" fontSize="9">Cross-Encoder Score</text>
              </g>

              {/* Node 4: Writer */}
              <g transform="translate(530, 40)">
                <rect width="140" height="80" rx="8" fill="var(--bg-surface-raised)" stroke="var(--border-subtle)" strokeWidth="1" />
                <circle cx="20" cy="24" r="4" fill="#06b6d4" />
                <text x="32" y="28" fill="currentColor" fontSize="11" fontWeight="600">WRITER</text>
                <text x="16" y="48" fill="var(--text-muted)" fontSize="9">Markdown Dossier</text>
                <text x="16" y="62" fill="var(--text-muted)" fontSize="9">Inline Citations [1]</text>
              </g>

              {/* Node 5: Reviewer */}
              <g transform="translate(700, 40)">
                <rect width="140" height="80" rx="8" fill="var(--bg-surface-raised)" stroke="#10b981" strokeWidth="1.5" />
                <circle cx="20" cy="24" r="4" fill="#10b981" />
                <text x="32" y="28" fill="currentColor" fontSize="11" fontWeight="600">REVIEWER</text>
                <text x="16" y="48" fill="var(--text-muted)" fontSize="9">Offset Verification</text>
                <text x="16" y="62" fill="#10b981" fontSize="9" fontWeight="600">Strict Verdict Gate</text>
              </g>
            </svg>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="space-y-6">
          <div className="text-left">
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary">Methodology</span>
            <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              How ResearchPilot Executes Investigations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <span className="font-mono text-xs text-primary font-bold">01</span>
              <h3 className="text-sm font-semibold text-foreground">Autonomous Decomposition</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Orchestrator agent converts high-level prompts into precise, targeted sub-queries. It prioritizes primary academic literature, technical RFCs, and benchmarks.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <span className="font-mono text-xs text-primary font-bold">02</span>
              <h3 className="text-sm font-semibold text-foreground">Hybrid Evidence Retrieval</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Queries are dispatched to the local SearXNG container and local PostgreSQL pgvector store. Reciprocal Rank Fusion (RRF) merges full-text tsvector and HNSW embeddings.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
              <span className="font-mono text-xs text-primary font-bold">03</span>
              <h3 className="text-sm font-semibold text-foreground">Adversarial Grounding Audit</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Reviewer agent inspects every draft sentence against extracted text offsets. If an ungrounded claim is detected, it forces an adversarial revision loop before release.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Differentiators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
            <Cpu className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">Zero Cloud Bills</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Powered by Ollama Qwen3:8B on your RTX 5060 GPU. Free, air-gapped, and unlimited.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">Cryptographic Citations</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every assertion is tied to an explicit SHA-256 hash and verifiable PDF page coordinates.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
            <Database className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">Unified PostgreSQL</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Unified relational checkpointer, HNSW pgvector indexing, and full-text search in PostgreSQL 16.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">Human-in-the-Loop Gate</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Optional pause points allow manual source curation before draft synthesis.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 bg-surface text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">ResearchPilot AI</span>
            <span>—</span>
            <span>Local-first, privacy-preserving research automation.</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <Link href="/dev/components" className="hover:text-foreground transition-colors">
              Components
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Register
            </Link>
            <a
              href="https://github.com/Akshat29-creator/Research-Pilot.git"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <Github className="h-3 w-3" /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
