import * as React from "react";
import { cn } from "@/lib/utils";

export interface KeyboardShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {
  keys: string[];
}

export function KeyboardShortcut({ keys, className, ...props }: KeyboardShortcutProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 select-none", className)}
      {...props}
    >
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-surface-raised px-1 font-mono text-[10px] font-medium text-muted-foreground shadow-xs"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
