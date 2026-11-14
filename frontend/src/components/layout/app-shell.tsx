"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/ui/command-palette";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts-dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useUIStore } from "@/stores/ui-store";
import { authApi } from "@/lib/api";
import { User } from "@/lib/types";

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  useKeyboardShortcuts();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const u = await authApi.getMe();
        setUser(u);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleCommandAction = (actionId: string) => {
    if (actionId === "new_research") router.push("/research/new");
    if (actionId === "sessions") router.push("/history");
    if (actionId === "documents") router.push("/documents");
    if (actionId === "observability") router.push("/observability");
    if (actionId === "settings") router.push("/settings");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground font-mono">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
          <span>Verifying research workspace authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased font-sans">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Navigation */}
      <MobileNav />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSelectAction={handleCommandAction}
      />

      {/* Global Keyboard Shortcuts Help (?) */}
      <KeyboardShortcutsDialog />
    </div>
  );
}
