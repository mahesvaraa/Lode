import { describe, it, expect, vi } from "vitest";
import { handleCommitContextMenu } from "@/features/contextMenu/handlers/commitHandlers";
import { handleBranchContextMenu } from "@/features/contextMenu/handlers/branchHandlers";
import type { MenuHandlerContext } from "@/features/contextMenu/handlers/handlerContext";
import type { RepoContext } from "@/menus";
import type { RepoDetails } from "@/api/types/repo_details";

describe("contextMenuHandlers", () => {
  const dummyRepo: RepoDetails = {
    path: "/test/repo",
    current_branch: "main",
    is_bare: false,
    head_hash: "abc1234",
    last_opened_timestamp: 1234567890,
  };

  const dummyRepoContext: RepoContext = {
    repoPath: "/test/repo",
    currentBranch: "main",
    commits: [
      {
        hash: "abc1234567890abcdef1234567890abcdef1234",
        short_hash: "abc1234",
        parents: [],
        author_name: "Test",
        author_email: "test@example.com",
        author_date: 1000,
        committer_name: "Test",
        committer_email: "test@example.com",
        committer_date: 1000,
        ref_names: ["HEAD -> main"],
        subject: "Initial commit",
        body: "",
      },
    ],
    status: null,
    refs: null,
    repoState: null,
  };

  const dummyContext: MenuHandlerContext = {
    currentRepo: dummyRepo,
    repoContext: dummyRepoContext,
    dialogs: {
      setBranchModal: vi.fn(),
      setTagModal: vi.fn(),
      setRenameModal: vi.fn(),
      setResetModal: vi.fn(),
      setMergeParentModal: vi.fn(),
      setUpstreamModal: vi.fn(),
      setConfirmModal: vi.fn(),
      setBlameModal: vi.fn(),
      setInteractiveRebaseModal: vi.fn(),
      setRewordModal: vi.fn(),
      setEditRemoteUrlModal: vi.fn(),
    },
    refreshAll: vi.fn().mockResolvedValue(undefined),
    showToast: vi.fn(),
  };

  it("builds commit context menu correctly", () => {
    const items = handleCommitContextMenu(
      "abc1234567890abcdef1234567890abcdef1234",
      dummyContext
    );
    expect(items.length).toBeGreaterThan(0);
    const checkoutItem = items.find((i) => i.id === "commit:checkout");
    expect(checkoutItem).toBeDefined();
  });

  it("builds branch context menu correctly", () => {
    const items = handleBranchContextMenu("feature/test", dummyContext);
    expect(items.length).toBeGreaterThan(0);
    const checkoutItem = items.find((i) => i.id === "branch:checkout");
    expect(checkoutItem).toBeDefined();
  });
});
