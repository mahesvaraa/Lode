import { describe, it, expect, vi } from "vitest";
import { buildCommitMenu } from "@/menus/commit";
import type { RepoContext } from "@/menus/types";
import type { Commit } from "@/api/types/commit";

describe("buildCommitMenu", () => {
  const dummyCommit: Commit = {
    hash: "abc1234567890",
    short_hash: "abc1234",
    parents: ["root1234"],
    author_name: "Test User",
    author_email: "test@example.com",
    author_date: 1600000000n,
    committer_name: "Test User",
    committer_email: "test@example.com",
    committer_date: 1600000000n,
    subject: "Initial feature",
    body: "Detailed description of feature",
    refs: [],
  };

  const baseContext: RepoContext = {
    repoPath: "/test/repo",
    repoState: { kind: "Normal", message: "" },
    status: {
      branch: {
        oid: "head123",
        head: "main",
        upstream: "origin/main",
        ahead: 0,
        behind: 0,
      },
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
    },
    refs: null,
    currentBranch: "main",
    commits: [dummyCommit],
  };

  const dummyCallbacks = {
    onCheckout: vi.fn(),
    onCreateBranch: vi.fn(),
    onCreateTag: vi.fn(),
    onCherryPick: vi.fn(),
    onRevert: vi.fn(),
    onFixup: vi.fn(),
    onReword: vi.fn(),
    onRebaseOnto: vi.fn(),
    onInteractiveRebase: vi.fn(),
    onCompareWithWorkingTree: vi.fn(),
    onCompareWithHead: vi.fn(),
    onReset: vi.fn(),
    onDrop: vi.fn(),
    showToast: vi.fn(),
  };

  it("builds standard menu for a regular commit", () => {
    const items = buildCommitMenu("abc1234567890", baseContext, dummyCallbacks);

    const ids = items.map((i) => (i.type === "item" ? i.id : i.type));
    expect(ids).toContain("commit:checkout");
    expect(ids).toContain("commit:create-branch");
    expect(ids).toContain("commit:cherry-pick");
    expect(ids).toContain("commit:revert");
    expect(ids).toContain("commit:reset");
    expect(ids).toContain("commit:drop");

    // Danger items are at the bottom
    const resetItem = items.find((i) => i.type === "item" && i.id === "commit:reset");
    expect(resetItem?.type === "item" && resetItem.danger).toBe(true);
  });

  it("handles merge commit with multiple parents and command hints", () => {
    const mergeCommit: Commit = {
      ...dummyCommit,
      hash: "merge1234",
      short_hash: "merge12",
      parents: ["p1", "p2"],
    };

    const mergeContext: RepoContext = {
      ...baseContext,
      commits: [mergeCommit],
    };

    const items = buildCommitMenu("merge1234", mergeContext, dummyCallbacks);
    const cherryPickItem = items.find(
      (i) => i.type === "item" && i.id === "commit:cherry-pick"
    );
    expect(cherryPickItem?.type === "item" && cherryPickItem.commandHint).toContain("-m 1");
  });

  it("handles active Git operation state (Merge/Rebase in progress)", () => {
    const inProgressContext: RepoContext = {
      ...baseContext,
      repoState: { kind: "Merge", message: "Merging branch feature" },
    };

    const items = buildCommitMenu("abc1234567890", inProgressContext, dummyCallbacks);
    const checkoutItem = items.find(
      (i) => i.type === "item" && i.id === "commit:checkout"
    );
    expect(checkoutItem?.type === "item" && checkoutItem.disabled).toBe(true);
    expect(checkoutItem?.type === "item" && checkoutItem.disabledReason).toContain("Идёт");
  });

  it("supports multi-select commit menu", () => {
    const multiContext: RepoContext = {
      ...baseContext,
      selectedCommitHashes: ["c1", "c2", "c3"],
    };

    const items = buildCommitMenu("c1", multiContext, dummyCallbacks);
    const header = items.find((i) => i.type === "header");
    expect(header?.type === "header" && header.label).toContain("Выбрано коммитов: 3");

    const ids = items.map((i) => (i.type === "item" ? i.id : i.type));
    expect(ids).toContain("commit:multi-cherry-pick");
    expect(ids).toContain("commit:multi-squash");
    expect(ids).toContain("commit:multi-copy-shas");
  });
});
