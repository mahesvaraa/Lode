import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "../src/store/uiStore";

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      theme: "system",
      sidebarWidth: 210,
      detailsWidth: 400,
      activeView: "hist",
    });
  });

  it("toggles theme correctly through system -> dark -> light -> system", () => {
    const store = useUiStore.getState();
    expect(store.theme).toBe("system");

    store.toggleTheme();
    expect(useUiStore.getState().theme).toBe("dark");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("light");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("system");
  });

  it("updates sidebar and details width within boundaries", () => {
    const store = useUiStore.getState();
    store.setSidebarWidth(250);
    expect(useUiStore.getState().sidebarWidth).toBe(250);

    store.setDetailsWidth(450);
    expect(useUiStore.getState().detailsWidth).toBe(450);
  });

  it("switches active views", () => {
    const store = useUiStore.getState();
    expect(store.activeView).toBe("hist");

    store.setActiveView("chg");
    expect(useUiStore.getState().activeView).toBe("chg");

    store.setActiveView("conf");
    expect(useUiStore.getState().activeView).toBe("conf");
  });
});
