import { create } from "zustand";
import { getAppSettings, saveAppSettings, loadFontData } from "@/api/client";
import type { AppSettings } from "@/api/types/settings";
import { useUiStore } from "./uiStore";

export const DEFAULT_SETTINGS: AppSettings = {
  git_path: null,
  recent_repos: [],
  theme: "system",
  font_size: 13,
  font_family: "Inter, Segoe UI, Geist, system-ui, sans-serif",
  code_font_family: "Cascadia Code, JetBrains Mono, Geist Mono, monospace",
  custom_font_path: null,
  custom_code_font_path: null,
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

let loadedUiFontFace: FontFace | null = null;
let loadedCodeFontFace: FontFace | null = null;

export const applyCustomFont = async (path: string | null | undefined, isCode: boolean) => {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const root = document.documentElement;

  if (!path) {
    if (isCode) {
      if (loadedCodeFontFace) {
        document.fonts.delete(loadedCodeFontFace);
        loadedCodeFontFace = null;
      }
      root.style.setProperty("--font-mono", DEFAULT_SETTINGS.code_font_family);
    } else {
      if (loadedUiFontFace) {
        document.fonts.delete(loadedUiFontFace);
        loadedUiFontFace = null;
      }
      root.style.setProperty("--font-ui", DEFAULT_SETTINGS.font_family);
      root.style.setProperty("--font-sans", DEFAULT_SETTINGS.font_family);
      if (document.body) {
        document.body.style.fontFamily = DEFAULT_SETTINGS.font_family;
      }
    }
    return;
  }

  try {
    const dataUrl = await loadFontData(path);
    const fontName = isCode ? "UserCustomCodeFont" : "UserCustomUiFont";
    const fontFace = new FontFace(fontName, `url(${dataUrl})`);
    const loaded = await fontFace.load();
    document.fonts.add(loaded);

    if (isCode) {
      if (loadedCodeFontFace) document.fonts.delete(loadedCodeFontFace);
      loadedCodeFontFace = loaded;
      const stack = `'${fontName}', ${DEFAULT_SETTINGS.code_font_family}`;
      root.style.setProperty("--font-mono", stack);
    } else {
      if (loadedUiFontFace) document.fonts.delete(loadedUiFontFace);
      loadedUiFontFace = loaded;
      const stack = `'${fontName}', ${DEFAULT_SETTINGS.font_family}`;
      root.style.setProperty("--font-ui", stack);
      root.style.setProperty("--font-sans", stack);
      if (document.body) {
        document.body.style.fontFamily = stack;
      }
    }
  } catch (err) {
    console.error("Failed to load custom font from file:", err);
  }
};

export const applySettingsToDom = (settings: AppSettings) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--font-size-base", `${settings.font_size}px`);

  if (settings.custom_font_path) {
    applyCustomFont(settings.custom_font_path, false);
  } else {
    root.style.setProperty("--font-sans", settings.font_family);
    root.style.setProperty("--font-ui", settings.font_family);
    if (document.body) {
      document.body.style.fontFamily = settings.font_family;
    }
  }

  if (settings.custom_code_font_path) {
    applyCustomFont(settings.custom_code_font_path, true);
  } else {
    root.style.setProperty("--font-mono", settings.code_font_family);
  }

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
