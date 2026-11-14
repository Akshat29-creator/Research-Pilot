"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Cpu, Sparkles, Database, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { researchApi } from "@/lib/api";
import { toast } from "sonner";

export default function NewResearchPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const samplePrompts = [
    "Empirical memory scaling and recall tradeoffs between HNSW and IVFFlat in pgvector on PostgreSQL 16",
    "Quantization degradation analysis of Qwen 2.5 7B at 4-bit AWQ vs GGUF Q4_K_M on edge robotics workloads",
    "Adversarial prompt injection vulnerabilities in tool-use LangGraph architectures: taxonomy and mitigation",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSubmitting(true);
    toast.info("Initializing multi-agent graph with RTX 5060 inference lock...");

    try {
      const sess = await researchApi.createSession(query, { approvalRequired: true });
      router.push(`/research/${sess.id}?q=${encodeURIComponent(query)}&stream=true`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error(`Backend error: ${msg}. Launching sandbox session.`);
      const sessionId = `sess_${Math.random().toString(36).substring(2, 8)}`;
      router.push(`/research/${sessionId}?q=${encodeURIComponent(query)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
            PIPELINE INITIALIZATION
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">5-Node Sequential Graph</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          New Research Investigation
        </h1>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          Formulate a complex technical inquiry. ResearchPilot AI will decompose it into sub-hypotheses, ingest academic literature via SearXNG and local vector stores, cross-examine claims, and compile an audited report.
        </p>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Research Target or Technical Prompt
          </label>
          <textarea
            rows={5}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the research target in detail. E.g.: Compare memory scaling and recall tradeoffs between HNSW (m=16, ef_construction=64) vs IVFFlat in pgvector on PostgreSQL 16..."
            className="w-full rounded-md border border-border bg-surface-raised p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-sans leading-relaxed"
          />
        </div>

        {/* Example Prompt Chips */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-mono text-muted-foreground block">
            Suggested Research Prompts:
          </span>
          <div className="flex flex-col gap-1.5">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuery(p)}
                className="text-left text-xs p-2 rounded-md border border-border bg-surface/50 hover:bg-surface-raised hover:border-zinc-500 text-muted-foreground hover:text-foreground transition-all font-mono"
              >
                → {p}
              </button>
            ))}
          </div>
        </div>

        {/* Footer info & button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5 text-emerald-500">
              <Cpu className="h-3.5 w-3.5" />
              <span>RTX 5060 (qwen3:8b)</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>pgvector (768-d)</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              <span>Adversarial Audit Gate</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!query.trim() || isSubmitting}
            className="gap-1.5 w-full sm:w-auto"
          >
            <span>{isSubmitting ? "Dispatching Pipeline..." : "Start Investigation"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
