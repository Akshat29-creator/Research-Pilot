"use client";

import * as React from "react";
import { History, Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export default function HistoryPage() {
  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-[10px]">
            ARCHIVE
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">0 Completed Sessions</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Research Session History
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Browse, filter, and review completed multi-agent research dossiers and citation graphs.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
        <EmptyState
          icon={History}
          title="No Historical Sessions Found"
          description="Your completed research investigations and generated reports will be archived here with full citation logs."
        />
      </div>
    </div>
  );
}
