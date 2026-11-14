import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusDotVariant = "healthy" | "degraded" | "failed" | "running" | "idle";

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusDotVariant;
  pulse?: boolean;
}

const colorMap: Record<StatusDotVariant, { dot: string; pulse: string; label: string }> = {
  healthy: { dot: "bg-emerald-500", pulse: "bg-emerald-400", label: "Healthy" },
  degraded: { dot: "bg-amber-500", pulse: "bg-amber-400", label: "Degraded" },
  failed: { dot: "bg-red-500", pulse: "bg-red-400", label: "Failed" },
  running: { dot: "bg-sky-500", pulse: "bg-sky-400", label: "Running" },
  idle: { dot: "bg-zinc-500", pulse: "bg-zinc-400", label: "Idle" },
};

export function StatusDot({ status, pulse = false, className, ...props }: StatusDotProps) {
  const config = colorMap[status] || colorMap.idle;
  return (
    <span className={cn("relative flex h-2 w-2 items-center justify-center", className)} {...props}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            config.pulse
          )}
        />
      )}
      <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dot)} />
    </span>
  );
}
