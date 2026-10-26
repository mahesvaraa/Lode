import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";
import { getFileManagerLabel, copyToClipboard } from "@/lib/platform";

export interface CommitFileMenuCallbacks {
  onOpenDiff: (path: string, commitHash: string) => void;
  onViewHistory: (path: string) => void;
  onViewBlame: (path: string, commitHash: string) => void;
  onRestoreFromCommit: (path: string, commitHash: string) => void;
  onShowInFileManager: (path: string) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildCommitFileMenu(
  filePath: string,
  commitHash: string,
  _context: RepoContext,
  callbacks: CommitFileMenuCallbacks
): MenuItem[] {
  const shortHash = commitHash.substring(0, 7);
  const fileManagerLabel = getFileManagerLabel();

  return [
    {
      type: "item",
      id: "commit-file:diff",
      label: "Показать diff файла",
      run: () => callbacks.onOpenDiff(filePath, commitHash),
    },
    {
      type: "item",
      id: "commit-file:history",
      label: "История файла (--follow)…",
      commandHint: `git log --follow -- ${filePath}`,
      run: () => callbacks.onViewHistory(filePath),
    },
    {
      type: "item",
      id: "commit-file:blame",
      label: `Blame на коммите ${shortHash}…`,
      commandHint: `git blame --porcelain ${commitHash} -- ${filePath}`,
      run: () => callbacks.onViewBlame(filePath, commitHash),
    },
    { type: "separator" },
    {
      type: "item",
      id: "commit-file:copy-path",
      label: "Копировать путь к файлу",
      run: async () => {
        await copyToClipboard(filePath);
        callbacks.showToast(`Путь скопирован: ${filePath}`);
      },
    },
    {
      type: "item",
      id: "commit-file:show-file-manager",
      label: fileManagerLabel,
      run: () => callbacks.onShowInFileManager(filePath),
    },
    { type: "separator" },
    {
      type: "item",
      id: "commit-file:restore",
      label: `Восстановить файл из этого коммита (${shortHash})…`,
      commandHint: `git restore --source=${shortHash} -- ${filePath}`,
      danger: true,
      run: () => callbacks.onRestoreFromCommit(filePath, commitHash),
    },
  ];
}
