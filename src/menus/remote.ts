import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";

export interface RemoteMenuCallbacks {
  onFetch: (remoteName: string) => void;
  onFetchPrune: (remoteName: string) => void;
  onEditUrl: (remoteName: string) => void;
  onRemove: (remoteName: string) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildRemoteMenu(
  remoteName: string,
  _context: RepoContext,
  callbacks: RemoteMenuCallbacks,
  remoteUrl?: string
): MenuItem[] {
  return [
    {
      type: "item",
      id: "remote:fetch",
      label: `Fetch '${remoteName}'`,
      commandHint: `git fetch ${remoteName}`,
      run: () => callbacks.onFetch(remoteName),
    },
    {
      type: "item",
      id: "remote:fetch-prune",
      label: `Fetch '${remoteName}' с очисткой (--prune)`,
      commandHint: `git fetch --prune ${remoteName}`,
      run: () => callbacks.onFetchPrune(remoteName),
    },
    { type: "separator" },
    {
      type: "item",
      id: "remote:edit-url",
      label: "Изменить URL…",
      commandHint: `git remote set-url ${remoteName} <url>`,
      run: () => callbacks.onEditUrl(remoteName),
    },
    {
      type: "item",
      id: "remote:copy-url",
      label: "Копировать URL",
      disabled: !remoteUrl,
      disabledReason: "URL отсутствует",
      run: async () => {
        if (remoteUrl) {
          await navigator.clipboard.writeText(remoteUrl);
          callbacks.showToast(`URL '${remoteName}' скопирован`);
        }
      },
    },
    { type: "separator" },
    {
      type: "item",
      id: "remote:delete",
      label: `Удалить remote '${remoteName}'…`,
      commandHint: `git remote remove ${remoteName}`,
      danger: true,
      run: () => callbacks.onRemove(remoteName),
    },
  ];
}
