import * as React from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "running" | "completed" | "error";

export interface StepItem {
  id: string;
  label: string;
  state: StepState;
  duration?: string;
}

export interface StepperProps {
  steps: StepItem[];
  className?: string;
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full", className)}>
      {steps.map((step, idx) => {
        const isRunning = step.state === "running";
        const isCompleted = step.state === "completed";
        const isError = step.state === "error";

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors flex-1 min-w-0",
                isRunning && "border-primary/40 bg-primary/5 text-primary shadow-xs",
                isCompleted && "border-border bg-surface text-foreground",
                isError && "border-destructive/40 bg-destructive/5 text-destructive",
                step.state === "pending" && "border-border/50 text-muted-foreground bg-transparent"
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono",
                  isRunning && "bg-primary text-primary-foreground",
                  isCompleted && "bg-secondary text-secondary-foreground",
                  isError && "bg-destructive text-destructive-foreground",
                  step.state === "pending" && "border border-border text-muted-foreground"
                )}
              >
                {isRunning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isCompleted ? (
                  <Check className="h-3 w-3" />
                ) : isError ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  idx + 1
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="truncate">{step.label}</div>
                {step.duration && (
                  <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {step.duration}
                  </div>
                )}
              </div>
            </div>

            {idx < steps.length - 1 && (
              <div className="hidden sm:block w-3 h-px bg-border shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
