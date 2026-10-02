import { create } from "zustand";
import { saveTheme } from "@/api/client";

export type ThemeMode = "system" | "dark" | "light";
export type ActiveView = "hist" | "chg" | "conf";

interface UiState {
  theme: ThemeMode;
  sidebarWidth: number;
  detailsWidth: number;
  activeView: ActiveView;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarWidth: (width: number) => void;
  setDetailsWidth: (width: number) => void;
  setActiveView: (view: ActiveView) => void;
  applyThemeToDom: (theme: ThemeMode) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: "system",
  sidebarWidth: 210,
  detailsWidth: 400,
  activeView: "hist",

  setTheme: (theme) => {
    set({ theme });
    get().applyThemeToDom(theme);
    if (typeof window !== "undefined") {
      saveTheme(theme).catch(console.error);
    }
  },

  toggleTheme: () => {
    const current = get().theme;
    let next: ThemeMode = "dark";
    if (current === "dark") next = "light";
    else if (current === "light") next = "system";
    else next = "dark";
    get().setTheme(next);
  },

  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setDetailsWidth: (detailsWidth) => set({ detailsWidth }),
  setActiveView: (activeView) => set({ activeView }),

  applyThemeToDom: (theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  },
}));
