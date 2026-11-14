import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  shortcutsHelpOpen: boolean;
  mobileNavOpen: boolean;
  sourcesDrawerOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsHelpOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSourcesDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  shortcutsHelpOpen: false,
  mobileNavOpen: false,
  sourcesDrawerOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  setCommandPaletteOpen: (open: boolean) => set({ commandPaletteOpen: open }),
  setShortcutsHelpOpen: (open: boolean) => set({ shortcutsHelpOpen: open }),
  setMobileNavOpen: (open: boolean) => set({ mobileNavOpen: open }),
  setSourcesDrawerOpen: (open: boolean) => set({ sourcesDrawerOpen: open }),
}));
