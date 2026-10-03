import { describe, it, expect } from "vitest";
import { useStashStore } from "../src/store/stashStore";

describe("stashStore", () => {
  it("has correct initial state", () => {
    const store = useStashStore.getState();
    expect(store.stashes).toEqual([]);
    expect(store.selectedStashDiff).toBeNull();
    expect(store.selectedSelector).toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("handles diff clearing, error clearing and reset", () => {
    useStashStore.setState({
      selectedSelector: "stash@{0}",
      selectedStashDiff: "diff --git a/file b/file",
      error: "Conflict",
    });

    useStashStore.getState().clearDiff();
    expect(useStashStore.getState().selectedStashDiff).toBeNull();

    useStashStore.getState().clearError();
    expect(useStashStore.getState().error).toBeNull();

    useStashStore.getState().reset();
    expect(useStashStore.getState().stashes).toEqual([]);
  });
});
