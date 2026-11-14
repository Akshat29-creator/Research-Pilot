"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KeyboardShortcut } from "@/components/ui/keyboard-shortcut";
import { useUIStore } from "@/stores/ui-store";

const shortcutsList = [
  { action: "Open Command Palette", keys: ["⌘", "K"] },
  { action: "Toggle Sidebar Collapse", keys: ["⌘", "B"] },
  { action: "Keyboard Shortcuts Help", keys: ["?"] },
  { action: "Dismiss Dialog / Drawer", keys: ["Esc"] },
  { action: "Execute / Start Research", keys: ["↵"] },
  { action: "Toggle Dark / Light Theme", keys: ["T"] },
];

export function KeyboardShortcutsDialog() {
  const { shortcutsHelpOpen, setShortcutsHelpOpen } = useUIStore();

  return (
    <Dialog open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold tracking-tight">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Linear-inspired power user keyboard shortcuts for rapid navigation.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60 py-2">
          {shortcutsList.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 text-xs">
              <span className="text-foreground/90">{item.action}</span>
              <KeyboardShortcut keys={item.keys} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
