import { describe, it, expect } from "vitest";
import { useWorktreeStore } from "../src/store/worktreeStore";

describe("worktreeStore", () => {
  it("has correct initial state", () => {
    const store = useWorktreeStore.getState();
    expect(store.worktrees).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("handles error clearing and reset", () => {
    useWorktreeStore.setState({
      worktrees: [
        {
          path: "/tmp/project-wt",
          head: "11112222",
          branch: "feature/wt",
          is_bare: false,
          is_detached: false,
          is_locked: false,
          lock_reason: null,
          is_main: false,
        },
      ],
      error: "Some error",
      isLoading: true,
    });

    expect(useWorktreeStore.getState().worktrees.length).toBe(1);

    useWorktreeStore.getState().clearError();
    expect(useWorktreeStore.getState().error).toBeNull();

    useWorktreeStore.getState().reset();
    expect(useWorktreeStore.getState().worktrees).toEqual([]);
    expect(useWorktreeStore.getState().isLoading).toBe(false);
  });
});
