import { describe, it, expect, vi } from "vitest";
import { buildWorkingFileMenu } from "@/menus/workingFile";
import type { RepoContext } from "@/menus/types";

describe("buildWorkingFileMenu", () => {
  const baseContext: RepoContext = {
    repoPath: "/test/repo",
    repoState: null,
    status: null,
    refs: null,
    currentBranch: "main",
    commits: [],
  };

  const dummyCallbacks = {
    onStageFile: vi.fn(),
    onUnstageFile: vi.fn(),
    onDiscardFile: vi.fn(),
    onStashFileOnly: vi.fn(),
    onViewHistory: vi.fn(),
    onViewBlame: vi.fn(),
    onAddToGitignore: vi.fn(),
    onDeleteUntracked: vi.fn(),
    onOpenConflictEditor: vi.fn(),
    onTakeVersion: vi.fn(),
    onMarkResolved: vi.fn(),
    onOpenExternalEditor: vi.fn(),
    onShowInFileManager: vi.fn(),
    showToast: vi.fn(),
  };

  it("builds menu for unstaged modified file", () => {
    const items = buildWorkingFileMenu(
      "src/index.ts",
      { isStaged: false, isUntracked: false, isConflicted: false },
      baseContext,
      dummyCallbacks
    );

    const ids = items.map((i) => (i.type === "item" ? i.id : i.type));
    expect(ids).toContain("file:stage");
    expect(ids).toContain("file:stash-only");
    expect(ids).toContain("file:discard");
    expect(ids).toContain("file:history");
    expect(ids).toContain("file:blame");
    expect(ids).toContain("file:copy-submenu");
  });

  it("builds menu for staged file", () => {
    const items = buildWorkingFileMenu(
      "src/index.ts",
      { isStaged: true, isUntracked: false, isConflicted: false },
      baseContext,
      dummyCallbacks
    );

    const ids = items.map((i) => (i.type === "item" ? i.id : i.type));
    expect(ids).toContain("file:unstage");
    expect(ids).not.toContain("file:stage");
    expect(ids).not.toContain("file:discard");
  });

  it("builds menu for untracked file with gitignore options", () => {
    const items = buildWorkingFileMenu(
      "temp/log.txt",
      { isStaged: false, isUntracked: true, isConflicted: false },
      baseContext,
      dummyCallbacks
    );

    const ids = items.map((i) => (i.type === "item" ? i.id : i.type));
    expect(ids).toContain("file:stage");
    expect(ids).toContain("file:gitignore-submenu");
    expect(ids).toContain("file:delete-untracked");

    const gitignoreItem = items.find(
      (i) => i.type === "item" && i.id === "file:gitignore-submenu"
    );
    expect(gitignoreItem?.type === "item" && gitignoreItem.children?.length).toBeGreaterThan(1);
  });

  it("builds menu for conflicted file with side choices", () => {
    const items = buildWorkingFileMenu(
      "src/app.ts",
      { isStaged: false, isUntracked: false, isConflicted: true },
      baseContext,
      dummyCallbacks
    );

    const ids = items.map((i) => (i.type === "item" ? i.id : i.type));
    expect(ids).toContain("file:open-conflicts");
    expect(ids).toContain("file:take-ours");
    expect(ids).toContain("file:take-theirs");
    expect(ids).toContain("file:mark-resolved");
  });

  it("builds menu for multi-selected files", () => {
    const multiContext: RepoContext = {
      ...baseContext,
      selectedFilePaths: ["file1.txt", "file2.txt", "file3.txt"],
    };

    const items = buildWorkingFileMenu(
      "file1.txt",
      { isStaged: false, isUntracked: false, isConflicted: false },
      multiContext,
      dummyCallbacks
    );

    const header = items.find((i) => i.type === "header");
    expect(header?.type === "header" && header.label).toContain("Выбрано файлов: 3");

    const ids = items.map((i) => (i.type === "item" ? i.id : i.type));
    expect(ids).toContain("file:multi-stage");
    expect(ids).toContain("file:multi-unstage");
    expect(ids).toContain("file:multi-discard");
    expect(ids).toContain("file:multi-copy-paths");
  });
});
