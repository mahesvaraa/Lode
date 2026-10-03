import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";

export interface RemoteBranchMenuCallbacks {
  onCheckoutTracking: (remoteBranch: string) => void;
  onMergeIntoCurrent: (remoteBranch: string) => void;
  onRebaseCurrentOnto: (remoteBranch: string) => void;
  onCreateBranchFrom: (remoteBranch: string) => void;
  onDeleteOnRemote: (remoteBranch: string) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildRemoteBranchMenu(
  remoteBranch: string,
  context: RepoContext,
  callbacks: RemoteBranchMenuCallbacks
): MenuItem[] {
  const isStateActive = Boolean(context.repoState && context.repoState.kind !== "Normal");
  const parts = remoteBranch.split("/");
  const remoteName = parts[0] || "origin";
  const branchPart = parts.slice(1).join("/");

  return [
    {
      type: "item",
      id: "remote-branch:checkout",
      label: `Checkout локальной ветки '${branchPart}' (отслеживать)`,
      commandHint: `git switch --track ${remoteBranch}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт активная операция Git" : undefined,
      run: () => callbacks.onCheckoutTracking(remoteBranch),
    },
    {
      type: "item",
      id: "remote-branch:create-branch",
      label: "Создать локальную ветку отсюда…",
      commandHint: `git switch -c <name> ${remoteBranch}`,
      run: () => callbacks.onCreateBranchFrom(remoteBranch),
    },
    { type: "separator" },
    {
      type: "item",
      id: "remote-branch:merge",
      label: `Влить '${remoteBranch}' в '${context.currentBranch || "HEAD"}'`,
      commandHint: `git merge ${remoteBranch}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт активная операция Git" : undefined,
      run: () => callbacks.onMergeIntoCurrent(remoteBranch),
    },
    {
      type: "item",
      id: "remote-branch:rebase",
      label: `Rebase текущей на '${remoteBranch}'`,
      commandHint: `git rebase ${remoteBranch}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт активная операция Git" : undefined,
      run: () => callbacks.onRebaseCurrentOnto(remoteBranch),
    },
    { type: "separator" },
    {
      type: "item",
      id: "remote-branch:copy-name",
      label: "Копировать полное имя",
      run: async () => {
        await navigator.clipboard.writeText(remoteBranch);
        callbacks.showToast(`Скопировано: ${remoteBranch}`);
      },
    },
    { type: "separator" },
    {
      type: "item",
      id: "remote-branch:delete",
      label: `Удалить ветку на remote '${remoteName}'…`,
      commandHint: `git push ${remoteName} --delete ${branchPart}`,
      danger: true,
      disabled: branchPart === "main" || branchPart === "master",
      disabledReason:
        branchPart === "main" || branchPart === "master"
          ? "Основная ветка защищена"
          : undefined,
      run: () => callbacks.onDeleteOnRemote(remoteBranch),
    },
  ];
}
