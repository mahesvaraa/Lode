import { describe, it, expect, vi } from "vitest";
import { buildPaletteCommands } from "../src/features/palette/paletteCommands";

describe("buildPaletteCommands", () => {
  it("generates correct commands with repo disabled/enabled states", () => {
    const noRepoCommands = buildPaletteCommands({
      hasRepo: false,
      repoState: null,
      onNavigate: vi.fn(),
      onPickRepo: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenRemotes: vi.fn(),
      onOpenNewBranch: vi.fn(),
      onOpenNewTag: vi.fn(),
      onOpenStash: vi.fn(),
      onFetch: vi.fn(),
      onPull: vi.fn(),
      onPush: vi.fn(),
      onStageAll: vi.fn(),
      onUnstageAll: vi.fn(),
      onContinue: vi.fn(),
      onAbort: vi.fn(),
      onRefreshRepo: vi.fn(),
      onCheckGit: vi.fn(),
      onUpdateSettings: vi.fn(),
    });

    const fetchCmd = noRepoCommands.find((c) => c.id === "remote:fetch");
    expect(fetchCmd?.enabled).toBe(false);

    const historyNav = noRepoCommands.find((c) => c.id === "nav:history");
    expect(historyNav?.enabled).toBeUndefined(); // Always available

    const withRepoCommands = buildPaletteCommands({
      hasRepo: true,
      repoPath: "/test/repo",
      repoState: null,
      onNavigate: vi.fn(),
      onPickRepo: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenRemotes: vi.fn(),
      onOpenNewBranch: vi.fn(),
      onOpenNewTag: vi.fn(),
      onOpenStash: vi.fn(),
      onFetch: vi.fn(),
      onPull: vi.fn(),
      onPush: vi.fn(),
      onStageAll: vi.fn(),
      onUnstageAll: vi.fn(),
      onContinue: vi.fn(),
      onAbort: vi.fn(),
      onRefreshRepo: vi.fn(),
      onCheckGit: vi.fn(),
      onUpdateSettings: vi.fn(),
    });

    const fetchCmdWithRepo = withRepoCommands.find((c) => c.id === "remote:fetch");
    expect(fetchCmdWithRepo?.enabled).toBe(true);
  });
});
