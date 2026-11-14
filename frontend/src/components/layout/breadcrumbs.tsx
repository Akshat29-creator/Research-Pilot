"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  research: "Research",
  new: "New Investigation",
  history: "Session History",
  documents: "Document Library",
  observability: "GPU & Observability",
  settings: "Settings",
  dev: "Developer",
  components: "UI Components",
};

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumbs" className={cn("flex items-center text-xs font-medium", className)}>
      <Link
        href="/dashboard"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        title="Dashboard Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((seg, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const isLast = idx === segments.length - 1;
        const label = routeLabels[seg] || seg;

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 mx-1.5 text-muted-foreground/60 shrink-0" />
            {isLast ? (
              <span className="text-foreground font-semibold truncate max-w-[180px]">{label}</span>
            ) : (
              <Link
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
