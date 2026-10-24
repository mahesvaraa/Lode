import { describe, it, expect, beforeEach } from "vitest";
import { useI18n, ruTranslations, enTranslations } from "@/lib/i18n";

describe("i18n store", () => {
  beforeEach(() => {
    useI18n.getState().setLocale("ru");
  });

  it("defaults to Russian translations", () => {
    const state = useI18n.getState();
    expect(state.locale).toBe("ru");
    expect(state.t.header.fetch).toBe("Получить");
    expect(state.t.sidebar.history).toBe("История");
  });

  it("switches to English translations dynamically", () => {
    useI18n.getState().setLocale("en");
    const state = useI18n.getState();
    expect(state.locale).toBe("en");
    expect(state.t.header.fetch).toBe("Fetch");
    expect(state.t.sidebar.history).toBe("History");
  });

  it("has consistent keys between ru and en dictionaries", () => {
    const ruKeys = Object.keys(ruTranslations).sort();
    const enKeys = Object.keys(enTranslations).sort();
    expect(ruKeys).toEqual(enKeys);
  });
});
