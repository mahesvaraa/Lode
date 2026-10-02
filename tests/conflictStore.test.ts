import { describe, it, expect } from "vitest";
import { computeSideLabels, useConflictStore } from "../src/store/conflictStore";
import type { RepoState } from "../src/api/types/repo_state";

describe("conflictStore", () => {
  it("computes side labels correctly for merge", () => {
    const mergeState: RepoState = {
      kind: "Merge",
      step: null,
      total_steps: null,
      head_name: "feature/login",
      onto: null,
      message: "Merging",
    };
    const labels = computeSideLabels(mergeState, "main");
    expect(labels.leftTitle).toBe("Текущая ветка");
    expect(labels.leftSubtitle).toBe("main");
    expect(labels.rightTitle).toBe("Вливаемая ветка");
    expect(labels.rightSubtitle).toBe("feature/login");
  });

  it("inverts/customizes side labels correctly for rebase (Rule 9.3)", () => {
    const rebaseState: RepoState = {
      kind: "Rebase",
      step: 2,
      total_steps: 5,
      head_name: "Add auth middleware",
      onto: "origin/main",
      message: "Rebasing",
    };
    const labels = computeSideLabels(rebaseState, "feature/auth");
    expect(labels.leftTitle).toBe("Основа (upstream)");
    expect(labels.leftSubtitle).toBe("origin/main");
    expect(labels.rightTitle).toBe("Ваш коммит");
    expect(labels.rightSubtitle).toBe("Add auth middleware");
  });

  it("handles initial store state and reset", () => {
    const store = useConflictStore.getState();
    expect(store.selectedFilePath).toBeNull();
    expect(store.activeFile).toBeNull();
    expect(store.currentBlockIndex).toBe(0);

    useConflictStore.setState({ error: "Failed to load", isSaving: true });
    expect(useConflictStore.getState().error).toBe("Failed to load");

    useConflictStore.getState().clearError();
    expect(useConflictStore.getState().error).toBeNull();

    useConflictStore.getState().reset();
    expect(useConflictStore.getState().isSaving).toBe(false);
  });
});
