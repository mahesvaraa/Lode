import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";

export interface StashMenuCallbacks {
  onApply: (index: number) => void;
  onPop: (index: number) => void;
  onBranch: (index: number) => void;
  onViewDiff: (index: number) => void;
  onDrop: (index: number) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildStashMenu(
  stashIndex: number,
  _context: RepoContext,
  callbacks: StashMenuCallbacks,
  message?: string
): MenuItem[] {
  return [
    {
      type: "item",
      id: "stash:apply",
      label: `Применить stash@{${stashIndex}} (apply)`,
      commandHint: `git stash apply stash@{${stashIndex}}`,
      run: () => callbacks.onApply(stashIndex),
    },
    {
      type: "item",
      id: "stash:pop",
      label: `Применить и удалить (pop)`,
      commandHint: `git stash pop stash@{${stashIndex}}`,
      run: () => callbacks.onPop(stashIndex),
    },
    {
      type: "item",
      id: "stash:branch",
      label: "Создать ветку из этого stash…",
      commandHint: `git stash branch <name> stash@{${stashIndex}}`,
      run: () => callbacks.onBranch(stashIndex),
    },
    {
      type: "item",
      id: "stash:view-diff",
      label: "Показать diff записей",
      commandHint: `git stash show -p stash@{${stashIndex}}`,
      run: () => callbacks.onViewDiff(stashIndex),
    },
    {
      type: "item",
      id: "stash:copy-message",
      label: "Копировать сообщение",
      disabled: !message,
      run: async () => {
        if (message) {
          await navigator.clipboard.writeText(message);
          callbacks.showToast("Сообщение stash скопировано");
        }
      },
    },
    { type: "separator" },
    {
      type: "item",
      id: "stash:drop",
      label: `Удалить stash@{${stashIndex}}…`,
      commandHint: `git stash drop stash@{${stashIndex}}`,
      danger: true,
      run: () => callbacks.onDrop(stashIndex),
    },
  ];
}
