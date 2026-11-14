"use client";

import * as React from "react";
import { HelpCircle, Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { StatusDot } from "@/components/ui/status-dot";
import { useUIStore } from "@/stores/ui-store";
import { User } from "@/lib/types";

export interface TopbarProps {
  user: User | null;
}

export function Topbar({ user }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { setCommandPaletteOpen, setShortcutsHelpOpen, setMobileNavOpen } = useUIStore();

  return (
    <header className="h-14 border-b border-border bg-surface/90 backdrop-blur-sm sticky top-0 z-20 px-4 flex items-center justify-between gap-4 select-none">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Breadcrumbs className="truncate" />
      </div>

      {/* Center: Command Palette Trigger */}
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden sm:flex items-center justify-between w-64 md:w-80 h-8 px-3 rounded-md border border-border bg-surface-raised text-xs text-muted-foreground hover:border-zinc-500 hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5" />
          <span>Jump to session or tool...</span>
        </div>
        <KeyboardShortcut keys={["⌘", "K"]} />
      </button>

      {/* Right: Telemetry pill, shortcuts help, theme, user */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface-raised font-mono text-[11px] text-muted-foreground">
          <StatusDot status="healthy" pulse />
          <span className="text-foreground font-semibold">RTX 5060</span>
          <span>•</span>
          <span>Qwen3:8B</span>
        </div>

        <button
          type="button"
          onClick={() => setShortcutsHelpOpen(true)}
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          title="Toggle Theme"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <UserMenu user={user} />
      </div>
    </header>
  );
}
