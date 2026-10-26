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

export const applyCustomFont = async (path: string, isCode: boolean, fallbackFamily: string) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const styleId = isCode ? "custom-code-font-style" : "custom-ui-font-style";
  const fontName = isCode ? "UserCustomCodeFont" : "UserCustomUiFont";

  // Clean up previous custom style
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  try {
    const dataUrl = await loadFontData(path);

    // Register via @font-face CSS
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      @font-face {
        font-family: '${fontName}';
        src: url('${dataUrl}');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.appendChild(styleEl);

    // Also register via Font Loading API
    if (typeof FontFace !== "undefined") {
      try {
        const fontFace = new FontFace(fontName, `url(${dataUrl})`, {
          weight: "100 900",
          style: "normal",
        });
        const loaded = await fontFace.load();
        if (isCode && loadedCodeFontFace) {
          document.fonts.delete(loadedCodeFontFace);
        } else if (!isCode && loadedUiFontFace) {
          document.fonts.delete(loadedUiFontFace);
        }
        document.fonts.add(loaded);
        if (isCode) loadedCodeFontFace = loaded;
        else loadedUiFontFace = loaded;
      } catch (fontErr) {
        console.warn("FontFace load note:", fontErr);
      }
    }

    const fullStack = `'${fontName}', ${fallbackFamily}`;
    if (isCode) {
      root.style.setProperty("--font-mono", fullStack);
    } else {
      root.style.setProperty("--font-ui", fullStack);
      root.style.setProperty("--font-sans", fullStack);
      if (document.body) {
        document.body.style.fontFamily = fullStack;
      }
    }
  } catch (err) {
    console.error("Failed to load custom font file:", err);
    throw err;
  }
};

export const applySettingsToDom = (settings: AppSettings) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--font-size-base", `${settings.font_size}px`);

  // 1. UI Font
  if (settings.custom_font_path) {
    applyCustomFont(settings.custom_font_path, false, settings.font_family);
  } else {
    const customUiStyle = document.getElementById("custom-ui-font-style");
    if (customUiStyle) {
      customUiStyle.remove();
    }
    if (typeof FontFace !== "undefined" && loadedUiFontFace) {
      document.fonts.delete(loadedUiFontFace);
      loadedUiFontFace = null;
    }
    root.style.setProperty("--font-sans", settings.font_family);
    root.style.setProperty("--font-ui", settings.font_family);
    if (document.body) {
      document.body.style.fontFamily = settings.font_family;
    }
  }

  // 2. Code Font
  if (settings.custom_code_font_path) {
    applyCustomFont(settings.custom_code_font_path, true, settings.code_font_family);
  } else {
    const customCodeStyle = document.getElementById("custom-code-font-style");
    if (customCodeStyle) {
      customCodeStyle.remove();
    }
    if (typeof FontFace !== "undefined" && loadedCodeFontFace) {
      document.fonts.delete(loadedCodeFontFace);
      loadedCodeFontFace = null;
    }
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
