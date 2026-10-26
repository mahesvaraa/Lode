import { describe, it, expect, vi } from "vitest";
import { useOperationStore } from "@/store/operationStore";
import { useHistoryStore } from "@/store/historyStore";
import * as clientApi from "@/api/client";

describe("operationStore", () => {
  it("starts and ends operation properly", () => {
    const store = useOperationStore.getState();
    expect(store.activeOperation).toBeNull();

    store.startOperation("Тестовая операция", "/path/to/repo", true);
    expect(useOperationStore.getState().activeOperation).toEqual({
      title: "Тестовая операция",
      repoPath: "/path/to/repo",
      startedAt: expect.any(Number),
      canCancel: true,
    });

    store.endOperation();
    expect(useOperationStore.getState().activeOperation).toBeNull();
  });

  it("handles start -> cancel -> end operation transitions", async () => {
    let resolveCancel!: () => void;
    const cancelPromise = new Promise<void>((resolve) => {
      resolveCancel = resolve;
    });
    vi.spyOn(clientApi, "cancelOperation").mockImplementation(() => cancelPromise);

    const store = useOperationStore.getState();
    expect(store.isCancelling).toBe(false);

    store.startOperation("Длинная операция", "/path/to/repo", true);
    expect(useOperationStore.getState().activeOperation?.canCancel).toBe(true);

    // Call cancel without awaiting immediately to observe in-flight cancelling state
    const cancelAction = store.cancelActiveOperation();
    expect(useOperationStore.getState().isCancelling).toBe(true);

    // Complete cancellation
    resolveCancel();
    await cancelAction;

    expect(useOperationStore.getState().activeOperation).toBeNull();
    expect(useOperationStore.getState().isCancelling).toBe(false);
  });
});

describe("historyStore comparison", () => {
  it("clears comparison state properly", () => {
    const store = useHistoryStore.getState();
    store.clearComparison();
    expect(store.comparisonBaseHash).toBeNull();
    expect(store.comparisonTargetHash).toBeNull();
    expect(store.comparisonDiffs).toBeNull();
  });

  it("handles error during comparison gracefully", async () => {
    vi.spyOn(clientApi, "getRevisionDiff").mockRejectedValueOnce(
      new Error("Git revision comparison failed")
    );

    const store = useHistoryStore.getState();
    await store.compareCommits("/repo", "abc1234", "def5678");

    const state = useHistoryStore.getState();
    expect(state.isLoadingComparison).toBe(false);
    expect(state.error).toContain("Git revision comparison failed");
    expect(state.comparisonDiffs).toBeNull();
  });
});
