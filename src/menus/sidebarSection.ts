import type { MenuItem } from "@/store/contextMenuStore";

export interface SidebarSectionMenuCallbacks {
  onCreateItem: (sectionId: string) => void;
  onRefresh: () => void;
}

export function buildSidebarSectionMenu(
  sectionId: string,
  callbacks: SidebarSectionMenuCallbacks
): MenuItem[] {
  const labelMap: Record<string, string> = {
    branches: "Создать новую ветку…",
    remotes: "Добавить remote…",
    tags: "Создать новый тег…",
    stashes: "Сохранить stash…",
  };

  const createLabel = labelMap[sectionId] || "Создать…";

  return [
    {
      type: "item",
      id: "sidebar:create",
      label: createLabel,
      run: () => callbacks.onCreateItem(sectionId),
    },
    { type: "separator" },
    {
      type: "item",
      id: "sidebar:refresh",
      label: "Обновить ссылки репозитория",
      run: () => callbacks.onRefresh(),
    },
  ];
}
