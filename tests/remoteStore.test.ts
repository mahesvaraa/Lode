import { describe, it, expect } from "vitest";
import { useRemoteStore } from "../src/store/remoteStore";

describe("remoteStore", () => {
  it("has correct initial state", () => {
    const store = useRemoteStore.getState();
    expect(store.remotes).toEqual([]);
    expect(store.isLoading).toBe(false);
    expect(store.isFetching).toBe(false);
    expect(store.isPulling).toBe(false);
    expect(store.isPushing).toBe(false);
    expect(store.pullMode).toBe("FfOnly");
    expect(store.error).toBeNull();
  });

  it("handles pull mode update, errors, and reset", () => {
    useRemoteStore.getState().setPullMode("Rebase");
    expect(useRemoteStore.getState().pullMode).toBe("Rebase");

    useRemoteStore.setState({ error: "Push failed", isPushing: true });
    expect(useRemoteStore.getState().error).toBe("Push failed");

    useRemoteStore.getState().clearError();
    expect(useRemoteStore.getState().error).toBeNull();

    useRemoteStore.getState().reset();
    expect(useRemoteStore.getState().pullMode).toBe("FfOnly");
    expect(useRemoteStore.getState().isPushing).toBe(false);
  });
});
