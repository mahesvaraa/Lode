import { describe, it, expect, vi } from "vitest";
import { buildBranchMenu } from "@/menus/branch";
import type { RepoContext } from "@/menus/types";

describe("buildBranchMenu", () => {
  const baseContext: RepoContext = {
    repoPath: "/test/repo",
    repoState: { kind: "Normal", message: "" },
    status: null,
    refs: {
      local_branches: [
        {
          name: "main",
          full_name: "refs/heads/main",
          kind: "LocalBranch",
          target: "c1",
          is_head: true,
          upstream: "origin/main",
          ahead: 0,
          behind: 0,
        },
        {
          name: "feature/foo",
          full_name: "refs/heads/feature/foo",
          kind: "LocalBranch",
          target: "c2",
          is_head: false,
          upstream: null,
          ahead: 0,
          behind: 0,
        },
      ],
      remote_branches: [],
      tags: [],
      current_branch: "main",
    },
    currentBranch: "main",
    commits: [],
  };

  const dummyCallbacks = {
    onCheckout: vi.fn(),
    onCreateBranch: vi.fn(),
    onMergeIntoCurrent: vi.fn(),
    onRebaseCurrentOnto: vi.fn(),
    onInteractiveRebaseCurrentOnto: vi.fn(),
    onCheckoutAndRebase: vi.fn(),
    onFetch: vi.fn(),
    onPull: vi.fn(),
    onPush: vi.fn(),
    onSetUpstream: vi.fn(),
    onUnsetUpstream: vi.fn(),
    onRename: vi.fn(),
    onForcePush: vi.fn(),
    onDelete: vi.fn(),
    onDeleteOnRemote: vi.fn(),
    showToast: vi.fn(),
  };

  it("disables checkout and delete for the currently checked-out branch", () => {
    const items = buildBranchMenu("main", baseContext, dummyCallbacks);

    const checkout = items.find((i) => i.type === "item" && i.id === "branch:checkout");
    expect(checkout?.type === "item" && checkout.disabled).toBe(true);
    expect(checkout?.type === "item" && checkout.disabledReason).toContain("Уже на этой ветке");

    const del = items.find((i) => i.type === "item" && i.id === "branch:delete");
    expect(del?.type === "item" && del.disabled).toBe(true);
    expect(del?.type === "item" && del.disabledReason).toContain("Нельзя удалить текущую ветку");
  });

  it("enables checkout and merge for another branch", () => {
    const items = buildBranchMenu("feature/foo", baseContext, dummyCallbacks);

    const checkout = items.find((i) => i.type === "item" && i.id === "branch:checkout");
    expect(checkout?.type === "item" && checkout.disabled).toBeFalsy();

    const mergeSubmenu = items.find((i) => i.type === "item" && i.id === "branch:merge-submenu");
    expect(mergeSubmenu?.type === "item" && mergeSubmenu.disabled).toBeFalsy();
    expect(mergeSubmenu?.type === "item" && mergeSubmenu.children?.length).toBe(4);
  });

  it("handles branch with no upstream", () => {
    const items = buildBranchMenu("feature/foo", baseContext, dummyCallbacks);

    const pushItem = items.find((i) => i.type === "item" && i.id === "branch:push");
    expect(pushItem?.type === "item" && pushItem.label).toContain("-u");

    const unsetUpstream = items.find((i) => i.type === "item" && i.id === "branch:unset-upstream");
    expect(unsetUpstream?.type === "item" && unsetUpstream.disabled).toBe(true);
  });
});
