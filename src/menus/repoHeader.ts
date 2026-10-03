import type { MenuItem } from "@/store/contextMenuStore";

export interface RepoHeaderMenuCallbacks {
  onShowInFileManager: (path: string) => void;
  onOpenInTerminal: (path: string) => void;
  onCopyPath: (path: string) => void;
  onCloseRepo: () => void;
}

export function buildRepoHeaderMenu(
  repoPath: string,
  callbacks: RepoHeaderMenuCallbacks
): MenuItem[] {
  const isWindows = navigator.userAgent.includes("Windows");
  const isMac = navigator.userAgent.includes("Mac");
  const fileManagerLabel = isWindows
    ? "Показать в Проводнике"
    : isMac
    ? "Показать в Finder"
    : "Показать в файловом менеджере";

  return [
    {
      type: "item",
      id: "repo:show-fm",
      label: fileManagerLabel,
      run: () => callbacks.onShowInFileManager(repoPath),
    },
    {
      type: "item",
      id: "repo:open-term",
      label: "Открыть в терминале",
      run: () => callbacks.onOpenInTerminal(repoPath),
    },
    {
      type: "item",
      id: "repo:copy-path",
      label: "Копировать путь к репозиторию",
      run: () => callbacks.onCopyPath(repoPath),
    },
    { type: "separator" },
    {
      type: "item",
      id: "repo:close",
      label: "Закрыть репозиторий",
      run: () => callbacks.onCloseRepo(),
    },
  ];
}
