import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  suggestions?: string[];
  onSelectSuggestion?: (suggestion: string) => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  suggestions,
  onSelectSuggestion,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-raised text-muted-foreground mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-medium text-foreground tracking-tight">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Suggested Research Queries
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSuggestion?.(s)}
                className="text-left text-xs px-3 py-2 rounded-md bg-surface-raised border border-border text-foreground hover:border-zinc-500 hover:bg-surface-hover transition-colors truncate"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
