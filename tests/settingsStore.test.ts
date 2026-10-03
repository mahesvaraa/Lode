import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_SETTINGS, applySettingsToDom } from "@/store/settingsStore";
import { useUiStore } from "@/store/uiStore";

describe("settingsStore", () => {
  beforeEach(() => {
    useUiStore.setState({ theme: "system" });
    const styles: Record<string, string> = {};
    const attrs: Record<string, string> = {};

    (globalThis as unknown as { document: unknown }).document = {
      documentElement: {
        style: {
          setProperty: (prop: string, val: string) => {
            styles[prop] = val;
          },
          getPropertyValue: (prop: string) => styles[prop] || "",
          removeProperty: (prop: string) => {
            delete styles[prop];
          },
        },
        setAttribute: (attr: string, val: string) => {
          attrs[attr] = val;
        },
        removeAttribute: (attr: string) => {
          delete attrs[attr];
        },
        getAttribute: (attr: string) => attrs[attr] || null,
      },
    };
  });

  it("should have correct default settings per CLAUDE.md", () => {
    expect(DEFAULT_SETTINGS.font_size).toBe(13);
    expect(DEFAULT_SETTINGS.pull_mode).toBe("ff-only");
    expect(DEFAULT_SETTINGS.theme).toBe("system");
    expect(DEFAULT_SETTINGS.font_family).toContain("Geist");
    expect(DEFAULT_SETTINGS.code_font_family).toContain("Geist Mono");
    expect(DEFAULT_SETTINGS.enable_fsmonitor).toBe(false);
    expect(DEFAULT_SETTINGS.enable_untracked_cache).toBe(false);
  });

  it("should apply settings to DOM correctly", () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      theme: "dark" as const,
      font_size: 16,
      font_family: "Inter, sans-serif",
      code_font_family: "Fira Code, monospace",
    };

    applySettingsToDom(customSettings);

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--font-size-base")).toBe("16px");
    expect(root.style.getPropertyValue("--font-sans")).toBe("Inter, sans-serif");
    expect(root.style.getPropertyValue("--font-mono")).toBe("Fira Code, monospace");
    expect(useUiStore.getState().theme).toBe("dark");
  });
});
