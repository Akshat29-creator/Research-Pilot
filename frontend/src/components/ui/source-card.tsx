import * as React from "react";
import { ExternalLink, FileText, Globe, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface SourceCardData {
  id: string;
  index: number;
  title: string;
  url?: string;
  domain?: string;
  author?: string;
  publishDate?: string;
  excerpt: string;
  credibilityScore: number;
  page?: number;
  deduped?: boolean;
}

export interface SourceCardProps {
  source: SourceCardData;
  onSelect?: (source: SourceCardData) => void;
  className?: string;
}

export function SourceCard({ source, onSelect, className }: SourceCardProps) {
  const isHighCredibility = source.credibilityScore >= 0.8;
  const isModerateCredibility = source.credibilityScore >= 0.5 && source.credibilityScore < 0.8;

  return (
    <div
      onClick={() => onSelect?.(source)}
      className={cn(
        "rounded-lg border border-border bg-surface p-3.5 transition-all hover:border-zinc-500 hover:bg-surface-hover cursor-pointer text-left",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] font-bold text-primary px-1 rounded bg-primary/10 border border-primary/20">
            [{source.index}]
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground truncate">
            {source.url ? <Globe className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
            {source.domain || (source.url ? new URL(source.url).hostname : "Local Document")}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {source.deduped && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              Deduped
            </Badge>
          )}
          <Badge
            variant={isHighCredibility ? "success" : isModerateCredibility ? "warning" : "destructive"}
            className="text-[10px] py-0 px-1.5 gap-1"
          >
            <ShieldCheck className="h-2.5 w-2.5" />
            {Math.round(source.credibilityScore * 100)}%
          </Badge>
        </div>
      </div>

      <h5 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
        {source.title}
      </h5>

      <p className="mt-2 text-[11px] text-muted-foreground line-clamp-3 leading-relaxed border-l-2 border-border pl-2">
        &ldquo;{source.excerpt}&rdquo;
      </p>

      <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>{source.page ? `Page ${source.page}` : source.publishDate || "Verified snippet"}</span>
        {source.url && (
          <span className="inline-flex items-center gap-0.5 text-primary">
            Source <ExternalLink className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
    </div>
  );
}
