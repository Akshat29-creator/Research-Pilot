"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search, Sparkles, History, Settings, FileText, Monitor, Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAction?: (actionId: string) => void;
}

export function CommandPalette({ open, onOpenChange, onSelectAction }: CommandPaletteProps) {
  const { setTheme } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-xl">
        <CommandPrimitive className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              placeholder="Type a command or search sessions..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandPrimitive.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <CommandPrimitive.Empty className="py-6 text-center text-xs text-muted-foreground">
              No matching commands found.
            </CommandPrimitive.Empty>

            <CommandPrimitive.Group heading="Navigation" className="text-[10px] font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
              <CommandPrimitive.Item
                onSelect={() => {
                  onSelectAction?.("new_research");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                <span>New Research Investigation</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() => {
                  onSelectAction?.("sessions");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Jump to Past Sessions</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() => {
                  onSelectAction?.("documents");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Document Ingestion Library</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() => {
                  onSelectAction?.("observability");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Monitor className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Observability & GPU VRAM Diagnostics</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() => {
                  onSelectAction?.("settings");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Workspace & Model Settings</span>
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>

            <CommandPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />

            <CommandPrimitive.Group heading="Preferences & Theme" className="text-[10px] font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
              <CommandPrimitive.Item
                onSelect={() => {
                  setTheme("dark");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Moon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Switch to Dark Theme</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() => {
                  setTheme("light");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Sun className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Switch to Light Theme</span>
              </CommandPrimitive.Item>
              <CommandPrimitive.Item
                onSelect={() => {
                  setTheme("system");
                  onOpenChange(false);
                }}
                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Laptop className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span>Use System Theme</span>
              </CommandPrimitive.Item>
            </CommandPrimitive.Group>
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
