"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CitationData {
  index: number;
  title: string;
  url?: string;
  excerpt: string;
  credibilityScore?: number;
  page?: number;
  hash?: string;
}

export interface CitationChipProps {
  citation: CitationData;
  onOpenDrawer?: (citation: CitationData) => void;
  className?: string;
}

export function CitationChip({ citation, onOpenDrawer, className }: CitationChipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors mx-0.5 align-baseline select-none",
            className
          )}
          aria-label={`Citation [${citation.index}]: ${citation.title}`}
        >
          [{citation.index}]
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={5}
          className="z-50 w-80 rounded-md border border-border bg-popover p-3.5 text-popover-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-2 mb-2">
            <span className="font-mono font-semibold text-foreground">
              SOURCE [{citation.index}]
            </span>
            {citation.credibilityScore !== undefined && (
              <span className="inline-flex items-center gap-1 font-mono text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                {Math.round(citation.credibilityScore * 100)}% verified
              </span>
            )}
          </div>

          <h5 className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
            {citation.title}
          </h5>

          <p className="mt-2 text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2 leading-relaxed">
            &ldquo;{citation.excerpt}&rdquo;
          </p>

          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>{citation.page ? `Page ${citation.page}` : "Web Source"}</span>
            <div className="flex items-center gap-2">
              {onOpenDrawer && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenDrawer(citation);
                  }}
                  className="hover:text-foreground underline underline-offset-2"
                >
                  View Details
                </button>
              )}
              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 hover:text-foreground text-primary"
                >
                  Visit <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
