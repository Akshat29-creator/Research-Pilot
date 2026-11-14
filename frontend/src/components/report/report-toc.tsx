"use client";

import * as React from "react";
import { List, ChevronRight, ShieldCheck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection } from "@/components/report/report-content";

export interface ReportTOCOps {
  sections: ReportSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  className?: string;
}

export function ReportTOC({
  sections,
  activeSectionId,
  onSelectSection,
  className,
}: ReportTOCOps) {
  return (
    <nav className={cn("flex flex-col space-y-1 text-xs select-none", className)}>
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono border-b border-border mb-2">
        <List className="h-3.5 w-3.5 text-primary" />
        <span>Table of Contents</span>
      </div>

      <div className="space-y-0.5">
        {sections.map((section) => {
          const isActive = activeSectionId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={cn(
                "group flex items-center justify-between w-full px-3 py-2 rounded-md text-left transition-all font-sans",
                isActive
                  ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              )}
            >
              <span className="truncate pr-2">{section.title}</span>
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  isActive && "opacity-100 text-primary"
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
