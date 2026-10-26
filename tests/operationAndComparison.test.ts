import { describe, it, expect } from "vitest";
import { useOperationStore } from "@/store/operationStore";
import { useHistoryStore } from "@/store/historyStore";

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
});

describe("historyStore comparison", () => {
  it("clears comparison state properly", () => {
    const store = useHistoryStore.getState();
    store.clearComparison();
    expect(store.comparisonBaseHash).toBeNull();
    expect(store.comparisonTargetHash).toBeNull();
    expect(store.comparisonDiffs).toBeNull();
  });
});
