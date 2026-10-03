import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";

export interface TagMenuCallbacks {
  onCheckout: (tagName: string) => void;
  onCreateBranch: (tagName: string) => void;
  onPushTag: (tagName: string) => void;
  onDeleteLocally: (tagName: string) => void;
  onDeleteOnRemote: (tagName: string) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildTagMenu(
  tagName: string,
  context: RepoContext,
  callbacks: TagMenuCallbacks
): MenuItem[] {
  const isStateActive = Boolean(context.repoState && context.repoState.kind !== "Normal");

  return [
    {
      type: "item",
      id: "tag:checkout",
      label: `Checkout тега '${tagName}'`,
      commandHint: `git switch --detach ${tagName}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onCheckout(tagName),
    },
    {
      type: "item",
      id: "tag:create-branch",
      label: "Создать ветку от этого тега…",
      commandHint: `git switch -c <name> ${tagName}`,
      run: () => callbacks.onCreateBranch(tagName),
    },
    {
      type: "item",
      id: "tag:push",
      label: `Push тега '${tagName}' на remote…`,
      commandHint: `git push origin ${tagName}`,
      run: () => callbacks.onPushTag(tagName),
    },
    {
      type: "item",
      id: "tag:copy-name",
      label: "Копировать имя тега",
      run: async () => {
        await navigator.clipboard.writeText(tagName);
        callbacks.showToast(`Тег скопирован: ${tagName}`);
      },
    },
    { type: "separator" },
    {
      type: "item",
      id: "tag:delete-local",
      label: `Удалить локальный тег '${tagName}'…`,
      commandHint: `git tag -d ${tagName}`,
      danger: true,
      run: () => callbacks.onDeleteLocally(tagName),
    },
    {
      type: "item",
      id: "tag:delete-remote",
      label: `Удалить тег '${tagName}' на remote…`,
      commandHint: `git push origin --delete ${tagName}`,
      danger: true,
      run: () => callbacks.onDeleteOnRemote(tagName),
    },
  ];
}
