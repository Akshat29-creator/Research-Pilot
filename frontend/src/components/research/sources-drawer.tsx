"use client";

import * as React from "react";
import {
  FileText,
  Globe,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle,
  Copy,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SourceCard, SourceCardData } from "@/components/ui/source-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const SAMPLE_SOURCES: SourceCardData[] = [
  {
    id: "src-1",
    index: 1,
    title: "pgvector: Open-source vector similarity search for Postgres (v0.7.0)",
    url: "https://github.com/pgvector/pgvector",
    domain: "github.com/pgvector",
    author: "pgvector core contributors",
    publishDate: "2024-05-18",
    excerpt: "HNSW indexes support L2 distance, inner product, and cosine distance. Build memory requirements scale with max_parallel_maintenance_workers and maintenance_work_mem.",
    credibilityScore: 0.96,
    page: 1,
  },
  {
    id: "src-2",
    index: 2,
    title: "Empirical Evaluation of Vector Index Algorithms in Relational Databases",
    url: "https://arxiv.org/abs/2407.10983",
    domain: "arxiv.org",
    author: "Zhang, L., & Mehta, A. (MIT CSAIL)",
    publishDate: "2024-07-15",
    excerpt: "Comparing HNSW vs IVFFlat on 1M 768-d vectors: HNSW achieves 98.4% recall@10 with 2.8ms latency, but incurs 1.8GB index footprint compared to 240MB for IVFFlat.",
    credibilityScore: 0.98,
    page: 7,
  },
  {
    id: "src-3",
    index: 3,
    title: "PostgreSQL 16 Shared Buffer Allocation & High-Concurrency Vector Query Contention",
    url: "https://www.postgresql.org/docs/16/runtime-config-resource.html",
    domain: "postgresql.org",
    author: "PostgreSQL Global Development Group",
    publishDate: "2023-09-14",
    excerpt: "Shared buffers hold shared memory blocks for tables and indexes. When vector index graph traversal exceeds shared_buffers, random disk reads dominate query p99 latency.",
    credibilityScore: 0.99,
    page: 42,
  },
  {
    id: "src-4",
    index: 4,
    title: "Benchmark Analysis: pgvector HNSW Tuning (M=16, ef_construction=64)",
    url: "https://jkatz05.com/post/postgres-vector-hnsw-tuning",
    domain: "jkatz05.com",
    author: "Jonathan Katz",
    publishDate: "2023-11-02",
    excerpt: "Higher M values increase recall at the cost of larger index sizes and longer build times. M=16 provides the optimal sweet spot for 768-dimension embeddings.",
    credibilityScore: 0.88,
    page: 2,
  },
  {
    id: "src-5",
    index: 5,
    title: "Duplicate: Vector Search Benchmarks on Postgres (Mirror)",
    url: "https://mirror.tech-notes.net/pgvector-bench",
    domain: "mirror.tech-notes.net",
    author: "Syndicated Feed",
    publishDate: "2023-11-05",
    excerpt: "Syndicated re-post of Jonathan Katz's HNSW tuning guide with duplicate benchmark charts.",
    credibilityScore: 0.45,
    deduped: true,
  },
  {
    id: "src-6",
    index: 6,
    title: "Scaling Approximate Nearest Neighbor Queries with pgvector and EDB",
    url: "https://www.enterprisedb.com/blog/scaling-pgvector-hnsw-benchmarks",
    domain: "enterprisedb.com",
    author: "EnterpriseDB Research Team",
    publishDate: "2024-03-21",
    excerpt: "PostgreSQL 16's improved parallel index builds accelerate HNSW construction by 3.2x when maintenance_work_mem is sized to 4GB.",
    credibilityScore: 0.92,
    page: 5,
  },
];

export interface SourcesDrawerProps {
  sources?: SourceCardData[];
  className?: string;
}

export function SourcesDrawer({
  sources = [],
  className,
}: SourcesDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "academic" | "web" | "deduped">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSource, setSelectedSource] = React.useState<SourceCardData | null>(null);
  const [copiedQuote, setCopiedQuote] = React.useState(false);

  const filteredSources = React.useMemo(() => {
    return sources.filter((s) => {
      // Tab filter
      if (activeTab === "academic" && !s.domain?.includes("arxiv") && !s.domain?.includes("mit") && !s.domain?.includes("org")) {
        return false;
      }
      if (activeTab === "web" && (s.domain?.includes("arxiv") || s.deduped)) {
        return false;
      }
      if (activeTab === "deduped" && !s.deduped) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.excerpt.toLowerCase().includes(q) ||
          (s.domain && s.domain.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [sources, activeTab, searchQuery]);

  const stats = React.useMemo(() => {
    const total = sources.length;
    const dedupedCount = sources.filter((s) => s.deduped).length;
    const avgScore =
      sources.reduce((acc, s) => acc + s.credibilityScore, 0) / (total || 1);
    return {
      total,
      dedupedCount,
      avgScorePct: Math.round(avgScore * 100),
    };
  }, [sources]);

  const handleCopyQuote = (quote: string) => {
    navigator.clipboard.writeText(quote);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  return (
    <div className={cn("flex flex-col h-full rounded-xl border border-border bg-surface shadow-xs overflow-hidden", className)}>
      {/* Header */}
      <div className="p-3.5 border-b border-border bg-surface-raised space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Ingested Sources
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface border border-border">
              {filteredSources.length} / {stats.total}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            <span>Avg Cred: {stats.avgScorePct}%</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sources or domains..."
            className="h-8 pl-8 text-xs font-sans bg-surface"
          />
        </div>

        {/* Tab filters */}
        <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-[11px] font-mono">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex-1 py-1 rounded transition-colors text-center",
              activeTab === "all" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={cn(
              "flex-1 py-1 rounded transition-colors text-center",
              activeTab === "academic" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Academic
          </button>
          <button
            onClick={() => setActiveTab("web")}
            className={cn(
              "flex-1 py-1 rounded transition-colors text-center",
              activeTab === "web" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Web
          </button>
          {stats.dedupedCount > 0 && (
            <button
              onClick={() => setActiveTab("deduped")}
              className={cn(
                "flex-1 py-1 rounded transition-colors text-center",
                activeTab === "deduped" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Deduped ({stats.dedupedCount})
            </button>
          )}
        </div>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredSources.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
            <span className="font-semibold text-foreground/80">No sources ingested yet</span>
            <span>The Research agent will populate verified sources upon query execution.</span>
          </div>
        ) : (
          filteredSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onSelect={(src) => setSelectedSource(src)}
            />
          ))
        )}
      </div>

      {/* Source Detail Modal */}
      <Dialog open={!!selectedSource} onOpenChange={(open) => !open && setSelectedSource(null)}>
        <DialogContent className="max-w-lg">
          {selectedSource && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    SOURCE #{selectedSource.index}
                  </Badge>
                  <Badge
                    variant={selectedSource.credibilityScore >= 0.8 ? "success" : "warning"}
                    className="font-mono text-[10px] gap-1"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {Math.round(selectedSource.credibilityScore * 100)}% Credibility
                  </Badge>
                </div>
                <DialogTitle className="text-sm font-bold text-foreground leading-snug">
                  {selectedSource.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-mono">
                  {selectedSource.author} • {selectedSource.publishDate}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-border bg-surface-raised p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span className="font-semibold text-foreground">Verified Excerpt / Text Span</span>
                    <button
                      onClick={() => handleCopyQuote(selectedSource.excerpt)}
                      className="flex items-center gap-1 hover:text-foreground text-[10px]"
                    >
                      {copiedQuote ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedQuote ? "Copied" : "Copy excerpt"}</span>
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/90 font-serif italic border-l-2 border-primary pl-3">
                    &quot;{selectedSource.excerpt}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded border border-border bg-surface">
                    <span className="text-muted-foreground block text-[10px]">Domain / Repository</span>
                    <span className="font-medium text-foreground truncate block">{selectedSource.domain}</span>
                  </div>
                  <div className="p-2 rounded border border-border bg-surface">
                    <span className="text-muted-foreground block text-[10px]">Page / Section</span>
                    <span className="font-medium text-foreground">{selectedSource.page ? `Page ${selectedSource.page}` : "Web Root"}</span>
                  </div>
                </div>

                {selectedSource.url && (
                  <Button
                    variant="outline"
                    className="w-full text-xs gap-1.5"
                    onClick={() => window.open(selectedSource.url, "_blank")}
                  >
                    <span>Inspect Raw Source URL</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
