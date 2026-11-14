"use client";

import * as React from "react";
import { ArrowRight, Bot, Cpu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function NewResearchPage() {
  const [query, setQuery] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    toast.info(`Initializing LangGraph multi-agent pipeline for: "${query}"`);
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-[10px]">
            PIPELINE INITIALIZATION
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">5-Node Sequential Graph</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          New Research Investigation
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Formulate a complex research inquiry. Agents will orchestrate search, cross-reference sources, analyze claims, write, and review.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Research Topic or Prompt
          </label>
          <textarea
            rows={4}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe the research target in detail. Example: Compare memory scaling and recall tradeoffs between HNSW (m=16, ef_construction=64) vs IVFFlat in pgvector on PostgreSQL 16..."
            className="w-full rounded-md border border-border bg-transparent p-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none font-sans"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span>Target Model: Qwen3:8B (Local RTX 5060)</span>
          </div>

          <Button type="submit" disabled={!query.trim()} className="gap-1.5">
            <span>Start Investigation</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
