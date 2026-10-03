import type { MenuItem } from "@/store/contextMenuStore";

export interface EmptyHistoryMenuCallbacks {
  onFetch: () => void;
  onRefresh: () => void;
  onJumpToHead: () => void;
}

export function buildEmptyHistoryMenu(
  callbacks: EmptyHistoryMenuCallbacks
): MenuItem[] {
  return [
    {
      type: "item",
      id: "history:refresh",
      label: "Обновить историю (F5)",
      shortcut: "F5",
      run: () => callbacks.onRefresh(),
    },
    {
      type: "item",
      id: "history:fetch",
      label: "Получить изменения (Fetch all)",
      commandHint: "git fetch --all --prune",
      run: () => callbacks.onFetch(),
    },
    { type: "separator" },
    {
      type: "item",
      id: "history:jump-head",
      label: "Перейти к коммиту HEAD",
      run: () => callbacks.onJumpToHead(),
    },
  ];
}
