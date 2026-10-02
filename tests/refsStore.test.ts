import { describe, it, expect } from "vitest";
import { useRefsStore } from "../src/store/refsStore";

describe("refsStore", () => {
  it("has correct initial state", () => {
    const store = useRefsStore.getState();
    expect(store.refs).toBeNull();
    expect(store.repoState).toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("handles error clearing and reset", () => {
    useRefsStore.setState({ error: "Something failed", isLoading: true });
    expect(useRefsStore.getState().error).toBe("Something failed");

    useRefsStore.getState().clearError();
    expect(useRefsStore.getState().error).toBeNull();

    useRefsStore.getState().reset();
    expect(useRefsStore.getState().isLoading).toBe(false);
  });
});
