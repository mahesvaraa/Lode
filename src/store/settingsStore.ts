import { create } from "zustand";
import { getAppSettings, saveAppSettings } from "@/api/client";
import type { AppSettings } from "@/api/types/settings";
import { useUiStore } from "./uiStore";

export const DEFAULT_SETTINGS: AppSettings = {
  git_path: null,
  recent_repos: [],
  theme: "system",
  font_size: 13,
  font_family: "Geist, system-ui, sans-serif",
  code_font_family: "Geist Mono, ui-monospace, monospace",
  pull_mode: "ff-only",
  external_editor: null,
  enable_fsmonitor: false,
  enable_untracked_cache: false,
};

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

export const applySettingsToDom = (settings: AppSettings) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--font-size-base", `${settings.font_size}px`);
  root.style.setProperty("--font-sans", settings.font_family);
  root.style.setProperty("--font-mono", settings.code_font_family);

  // Sync theme
  useUiStore.getState().setTheme(settings.theme as "system" | "dark" | "light");
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await getAppSettings();
      applySettingsToDom(settings);
      set({ settings, isLoaded: true, isLoading: false });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      set({
        error: errObj.message || "Ошибка загрузки настроек",
        isLoading: false,
        isLoaded: true,
      });
    }
  },

  updateSettings: async (partial: Partial<AppSettings>) => {
    const current = get().settings;
    const updated: AppSettings = { ...current, ...partial };

    // Optimistically update in store and DOM
    set({ settings: updated });
    applySettingsToDom(updated);

    try {
      const saved = await saveAppSettings(updated);
      set({ settings: saved });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      set({ error: errObj.message || "Ошибка сохранения настроек" });
    }
  },
}));
