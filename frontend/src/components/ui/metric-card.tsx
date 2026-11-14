import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-4 text-left shadow-xs",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span className="font-medium tracking-tight truncate">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="font-mono text-xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </div>

        {trend && (
          <span
            className={cn(
              "font-mono text-[11px] font-medium tabular-nums",
              trend.isPositive ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-1 text-[11px] text-muted-foreground truncate font-mono">
          {subtext}
        </div>
      )}
    </div>
  );
}
