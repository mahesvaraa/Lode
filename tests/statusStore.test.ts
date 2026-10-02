import { describe, it, expect } from "vitest";
import { getFileStatusLabel, useStatusStore } from "../src/store/statusStore";

describe("statusStore and helpers", () => {
  it("maps FileStatusKind enum to short character correctly", () => {
    expect(getFileStatusLabel("Modified")).toBe("M");
    expect(getFileStatusLabel("Added")).toBe("A");
    expect(getFileStatusLabel("Deleted")).toBe("D");
    expect(getFileStatusLabel("Renamed")).toBe("R");
    expect(getFileStatusLabel("Copied")).toBe("C");
    expect(getFileStatusLabel("Untracked")).toBe("?");
    expect(getFileStatusLabel("Conflicted")).toBe("U");
    expect(getFileStatusLabel("TypeChanged")).toBe("T");
  });

  it("handles diff mode toggle", () => {
    const store = useStatusStore.getState();
    expect(store.diffMode).toBe("inline");

    store.setDiffMode("side-by-side");
    expect(useStatusStore.getState().diffMode).toBe("side-by-side");

    store.setDiffMode("inline");
    expect(useStatusStore.getState().diffMode).toBe("inline");
  });

  it("handles showFullDiff flag", () => {
    const store = useStatusStore.getState();
    expect(store.showFullDiff).toBe(false);

    store.setShowFullDiff(true);
    expect(useStatusStore.getState().showFullDiff).toBe(true);
  });
});
