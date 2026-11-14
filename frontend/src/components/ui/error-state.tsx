import * as React from "react";
import { AlertCircle, Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "An unexpected error occurred",
  message,
  details,
  onRetry,
  className,
}: ErrorStateProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const payload = `${title}\n${message}${details ? `\n\nStack Trace / Details:\n${details}` : ""}`;
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-destructive">{title}</h4>
          <p className="mt-1 text-xs text-foreground/80 leading-relaxed break-words">{message}</p>

          {details && (
            <pre className="mt-2.5 max-h-32 overflow-auto rounded bg-background/80 p-2 font-mono text-[11px] text-muted-foreground border border-border">
              {details}
            </pre>
          )}

          <div className="mt-3 flex items-center gap-2">
            {onRetry && (
              <Button size="xs" variant="destructive" onClick={onRetry} className="gap-1.5">
                <RefreshCw className="h-3 w-3" /> Retry Action
              </Button>
            )}
            <Button size="xs" variant="outline" onClick={handleCopy} className="gap-1.5">
              <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy Diagnostics"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
