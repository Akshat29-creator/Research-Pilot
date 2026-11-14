"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  History,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { StatusDot } from "@/components/ui/status-dot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Research", href: "/research/new", icon: Plus, badge: "⌘N" },
  { label: "History", href: "/history", icon: History },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Observability", href: "/observability", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-surface transition-all duration-200 select-none z-30 shrink-0",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary font-bold text-xs tracking-wider">
            RP
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs tracking-tight text-foreground truncate">
                ResearchPilot
              </span>
              <span className="font-mono text-[10px] text-muted-foreground truncate">
                Local-First • RTX 5060
              </span>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          title={sidebarCollapsed ? "Expand Sidebar (⌘B)" : "Collapse Sidebar (⌘B)"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (sidebarCollapsed) {
            return (
              <Tooltip key={item.href} delayDuration={100}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-9 w-9 mx-auto items-center justify-center rounded-md text-muted-foreground transition-colors",
                      isActive
                        ? "bg-surface-raised text-foreground font-semibold border border-border shadow-xs"
                        : "hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span>{item.label}</span>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
                isActive
                  ? "bg-surface-raised text-foreground font-semibold border border-border shadow-xs"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="font-mono text-[10px] text-muted-foreground/80 px-1 py-0.5 rounded bg-surface border border-border">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Hardware Status Footer */}
      <div className="p-2 border-t border-border">
        {sidebarCollapsed ? (
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-md bg-surface-raised border border-border">
                <StatusDot status="healthy" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="font-mono text-[11px]">
                <div>RTX 5060: Healthy</div>
                <div className="text-muted-foreground">Qwen3:8B (Local)</div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="rounded-lg border border-border bg-surface-raised p-2.5 text-left text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Cpu className="h-3 w-3 text-primary" /> NVIDIA RTX 5060
              </span>
              <StatusDot status="healthy" pulse />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground flex items-center justify-between">
              <span>Qwen3:8B</span>
              <span className="text-emerald-400">100% Free / Local</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
