"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Cpu,
  FileText,
  History,
  LayoutDashboard,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/status-dot";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Research", href: "/research/new", icon: Plus },
  { label: "History", href: "/history", icon: History },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Observability", href: "/observability", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useUIStore();

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-72 p-0 bg-surface">
        <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-xs font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary font-bold text-xs">
              RP
            </div>
            <span>ResearchPilot AI</span>
          </SheetTitle>
        </SheetHeader>

        <div className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "bg-surface-raised text-foreground font-semibold border border-border"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg border border-border bg-surface-raised">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" /> RTX 5060
            </span>
            <StatusDot status="healthy" pulse />
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            Local Ollama • 100% Free
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
