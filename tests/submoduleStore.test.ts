import { describe, it, expect } from "vitest";
import { useSubmoduleStore } from "../src/store/submoduleStore";

describe("submoduleStore", () => {
  it("has correct initial state", () => {
    const store = useSubmoduleStore.getState();
    expect(store.submodules).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("handles error clearing and reset", () => {
    useSubmoduleStore.setState({
      submodules: [
        {
          path: "libs/core",
          name: "core",
          head: "aaaa1111",
          status_indicator: " ",
          describe: "v1.2",
          is_initialized: true,
          is_modified: false,
          has_conflict: false,
        },
      ],
      error: "Failed to load submodules",
      isLoading: true,
    });

    expect(useSubmoduleStore.getState().submodules.length).toBe(1);

    useSubmoduleStore.getState().clearError();
    expect(useSubmoduleStore.getState().error).toBeNull();

    useSubmoduleStore.getState().reset();
    expect(useSubmoduleStore.getState().submodules).toEqual([]);
    expect(useSubmoduleStore.getState().isLoading).toBe(false);
  });
});
