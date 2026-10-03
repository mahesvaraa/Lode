import type { MenuItem } from "@/store/contextMenuStore";

export interface HunkMenuCallbacks {
  onStageHunk: (path: string, hunkIndex: number) => void;
  onUnstageHunk: (path: string, hunkIndex: number) => void;
  onDiscardHunk: (path: string, hunkIndex: number) => void;
  onCopyPatch: (path: string, hunkIndex: number) => void;
}

export function buildHunkMenu(
  filePath: string,
  hunkIndex: number,
  isStaged: boolean,
  callbacks: HunkMenuCallbacks
): MenuItem[] {
  if (isStaged) {
    return [
      {
        type: "item",
        id: "hunk:unstage",
        label: "Убрать фрагмент (hunk) из индекса",
        commandHint: "git apply --cached --reverse --recount -",
        run: () => callbacks.onUnstageHunk(filePath, hunkIndex),
      },
      {
        type: "item",
        id: "hunk:copy-patch",
        label: "Копировать фрагмент как патч",
        run: () => callbacks.onCopyPatch(filePath, hunkIndex),
      },
    ];
  }

  return [
    {
      type: "item",
      id: "hunk:stage",
      label: "Добавить фрагмент (hunk) в индекс",
      commandHint: "git apply --cached --recount -",
      run: () => callbacks.onStageHunk(filePath, hunkIndex),
    },
    {
      type: "item",
      id: "hunk:copy-patch",
      label: "Копировать фрагмент как патч",
      run: () => callbacks.onCopyPatch(filePath, hunkIndex),
    },
    { type: "separator" },
    {
      type: "item",
      id: "hunk:discard",
      label: "Сбросить фрагмент (hunk)…",
      commandHint: "git apply --reverse --recount -",
      danger: true,
      run: () => callbacks.onDiscardHunk(filePath, hunkIndex),
    },
  ];
}
