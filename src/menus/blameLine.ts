import type { MenuItem } from "@/store/contextMenuStore";

export interface BlameLineMenuCallbacks {
  onShowCommit: (hash: string) => void;
  onBlamePrevious: (hash: string, path: string) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildBlameLineMenu(
  lineNo: number,
  hash: string,
  path: string,
  callbacks: BlameLineMenuCallbacks
): MenuItem[] {
  const shortHash = hash.substring(0, 7);
  const isZeroHash = hash.startsWith("0000000");

  return [
    {
      type: "item",
      id: "blame:show-commit",
      label: `Показать коммит ${shortHash}`,
      disabled: isZeroHash,
      disabledReason: "Не закоммиченные изменения",
      run: () => callbacks.onShowCommit(hash),
    },
    {
      type: "item",
      id: "blame:blame-prev",
      label: `Blame предыдущей ревизии (${shortHash}^)`,
      commandHint: `git blame ${hash}^ -- ${path}`,
      disabled: isZeroHash,
      disabledReason: "Не закоммиченные изменения",
      run: () => callbacks.onBlamePrevious(hash, path),
    },
    { type: "separator" },
    {
      type: "item",
      id: "blame:copy-sha",
      label: "Копировать SHA коммита",
      disabled: isZeroHash,
      run: async () => {
        await navigator.clipboard.writeText(hash);
        callbacks.showToast(`SHA скопирован: ${shortHash}`);
      },
    },
    {
      type: "item",
      id: "blame:copy-line",
      label: `Копировать номер строки (${lineNo})`,
      run: async () => {
        await navigator.clipboard.writeText(String(lineNo));
        callbacks.showToast(`Номер строки скопирован: ${lineNo}`);
      },
    },
  ];
}
