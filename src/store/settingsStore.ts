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
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const styleId = isCode ? "custom-code-font-style" : "custom-ui-font-style";
  let existingStyle = document.getElementById(styleId);

  if (!path) {
    if (existingStyle) {
      existingStyle.remove();
    }
    if (isCode) {
      if (typeof FontFace !== "undefined" && loadedCodeFontFace) {
        document.fonts.delete(loadedCodeFontFace);
        loadedCodeFontFace = null;
      }
      root.style.setProperty("--font-mono", DEFAULT_SETTINGS.code_font_family);
    } else {
      if (typeof FontFace !== "undefined" && loadedUiFontFace) {
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

    if (!existingStyle) {
      existingStyle = document.createElement("style");
      existingStyle.id = styleId;
      document.head.appendChild(existingStyle);
    }

    if (isCode) {
      existingStyle.textContent = `
        @font-face {
          font-family: '${fontName}';
          src: url('${dataUrl}');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }
        :root {
          --font-mono: '${fontName}', monospace !important;
        }
        .mono, .hash, pre, code, .cm-editor, .cm-content, .cm-line {
          font-family: '${fontName}', monospace !important;
        }
      `;
      root.style.setProperty("--font-mono", `'${fontName}', monospace`);
    } else {
      existingStyle.textContent = `
        @font-face {
          font-family: '${fontName}';
          src: url('${dataUrl}');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }
        :root {
          --font-ui: '${fontName}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          --font-sans: '${fontName}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        body, button, input, select, textarea, div, span, p, label, a, table, th, td {
          font-family: '${fontName}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .mono, .hash, pre, code, .cm-editor, .cm-content, .cm-line {
          font-family: var(--font-mono) !important;
        }
      `;
      root.style.setProperty("--font-ui", `'${fontName}', sans-serif`);
      root.style.setProperty("--font-sans", `'${fontName}', sans-serif`);
      if (document.body) {
        document.body.style.fontFamily = `'${fontName}', sans-serif`;
      }
    }

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
        console.warn("FontFace API registration note:", fontErr);
      }
    }
  } catch (err) {
    console.error("Failed to load custom font from file:", err);
    throw err;
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
