import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";

export interface BranchMenuCallbacks {
  onCheckout: (branchName: string) => void;
  onCreateBranch: (startPoint: string) => void;
  onMergeIntoCurrent: (
    branchName: string,
    mode: "normal" | "no-ff" | "squash" | "ff-only"
  ) => void;
  onRebaseCurrentOnto: (branchName: string) => void;
  onInteractiveRebaseCurrentOnto: (branchName: string) => void;
  onCheckoutAndRebase: (branchName: string) => void;
  onFetch: (remoteName?: string) => void;
  onPull: () => void;
  onPush: (setUpstream?: boolean) => void;
  onSetUpstream: (branchName: string) => void;
  onUnsetUpstream: (branchName: string) => void;
  onRename: (branchName: string) => void;
  onForcePush: (branchName: string) => void;
  onDelete: (branchName: string) => void;
  onDeleteOnRemote: (branchName: string) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildBranchMenu(
  branchName: string,
  context: RepoContext,
  callbacks: BranchMenuCallbacks
): MenuItem[] {
  const isCurrent = context.currentBranch === branchName;
  const isStateActive = Boolean(context.repoState && context.repoState.kind !== "Normal");
  const branchInfo = context.refs?.local_branches.find((b) => b.name === branchName);
  const upstream = branchInfo?.upstream;
  const isProtected =
    branchName === "main" || branchName === "master" || branchName === "develop";

  return [
    // 1. Navigation
    {
      type: "item",
      id: "branch:checkout",
      label: `Checkout ветки '${branchName}'`,
      commandHint: `git switch ${branchName}`,
      disabled: isCurrent || isStateActive,
      disabledReason: isCurrent
        ? "Уже на этой ветке"
        : isStateActive
        ? "Идёт операция Git"
        : undefined,
      run: () => callbacks.onCheckout(branchName),
    },
    {
      type: "item",
      id: "branch:create-from",
      label: "Создать ветку отсюда…",
      commandHint: `git switch -c <name> ${branchName}`,
      run: () => callbacks.onCreateBranch(branchName),
    },
    { type: "separator" },

    // 2. Integration
    {
      type: "item",
      id: "branch:merge-submenu",
      label: `Влить '${branchName}' в '${context.currentBranch || "HEAD"}'`,
      disabled: isCurrent || isStateActive,
      disabledReason: isCurrent
        ? "Нельзя слить ветку саму в себя"
        : isStateActive
        ? "Идёт активная операция Git"
        : undefined,
      children: [
        {
          type: "item",
          id: "branch:merge-normal",
          label: "Обычное слияние",
          commandHint: `git merge ${branchName}`,
          run: () => callbacks.onMergeIntoCurrent(branchName, "normal"),
        },
        {
          type: "item",
          id: "branch:merge-no-ff",
          label: "С созданием коммита (--no-ff)",
          commandHint: `git merge --no-ff ${branchName}`,
          run: () => callbacks.onMergeIntoCurrent(branchName, "no-ff"),
        },
        {
          type: "item",
          id: "branch:merge-squash",
          label: "Объединить в один коммит (--squash)",
          commandHint: `git merge --squash ${branchName}`,
          run: () => callbacks.onMergeIntoCurrent(branchName, "squash"),
        },
        {
          type: "item",
          id: "branch:merge-ff-only",
          label: "Только быстрая перемотка (--ff-only)",
          commandHint: `git merge --ff-only ${branchName}`,
          run: () => callbacks.onMergeIntoCurrent(branchName, "ff-only"),
        },
      ],
    },
    {
      type: "item",
      id: "branch:rebase-onto",
      label: `Rebase текущей на '${branchName}'`,
      commandHint: `git rebase ${branchName}`,
      disabled: isCurrent || isStateActive,
      disabledReason: isCurrent ? "Нельзя перебазировать на саму себя" : isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onRebaseCurrentOnto(branchName),
    },
    {
      type: "item",
      id: "branch:interactive-rebase-onto",
      label: `Интерактивный rebase текущей на '${branchName}'…`,
      commandHint: `git rebase -i ${branchName}`,
      disabled: isCurrent || isStateActive,
      disabledReason: isCurrent ? "Нельзя перебазировать на саму себя" : isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onInteractiveRebaseCurrentOnto(branchName),
    },
    {
      type: "item",
      id: "branch:checkout-and-rebase",
      label: `Checkout '${branchName}' и rebase на '${context.currentBranch || "HEAD"}'…`,
      commandHint: `git switch ${branchName} && git rebase ${context.currentBranch || "HEAD"}`,
      disabled: isCurrent || isStateActive,
      disabledReason: isCurrent ? "Уже на этой ветке" : isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onCheckoutAndRebase(branchName),
    },
    { type: "separator" },

    // 3. Remote
    {
      type: "item",
      id: "branch:pull",
      label: "Pull (получить изменения)",
      commandHint: `git pull origin ${branchName}`,
      disabled: !isCurrent || !upstream || isStateActive,
      disabledReason: !isCurrent
        ? "Pull возможен только для текущей ветки"
        : !upstream
        ? "У ветки нет связанного upstream"
        : "Идёт операция Git",
      run: () => callbacks.onPull(),
    },
    {
      type: "item",
      id: "branch:push",
      label: upstream ? "Push" : "Push и установить upstream (-u)…",
      commandHint: upstream
        ? `git push origin ${branchName}`
        : `git push -u origin ${branchName}`,
      disabled: isStateActive,
      run: () => callbacks.onPush(!upstream),
    },
    {
      type: "item",
      id: "branch:set-upstream",
      label: upstream ? "Изменить upstream…" : "Установить upstream…",
      commandHint: `git branch --set-upstream-to=<remote>/<branch> ${branchName}`,
      run: () => callbacks.onSetUpstream(branchName),
    },
    {
      type: "item",
      id: "branch:unset-upstream",
      label: "Убрать upstream",
      commandHint: `git branch --unset-upstream ${branchName}`,
      disabled: !upstream,
      disabledReason: "Upstream не настроен",
      run: () => callbacks.onUnsetUpstream(branchName),
    },
    { type: "separator" },

    // 4. Utility
    {
      type: "item",
      id: "branch:rename",
      label: "Переименовать ветку…",
      commandHint: `git branch -m ${branchName} <new-name>`,
      run: () => callbacks.onRename(branchName),
    },
    {
      type: "item",
      id: "branch:copy-name",
      label: "Копировать имя ветки",
      run: async () => {
        await navigator.clipboard.writeText(branchName);
        callbacks.showToast(`Имя ветки скопировано: ${branchName}`);
      },
    },
    { type: "separator" },

    // 5. Danger actions (Red)
    {
      type: "item",
      id: "branch:force-push",
      label: "Force push (--force-with-lease)…",
      commandHint: `git push --force-with-lease origin ${branchName}`,
      danger: true,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onForcePush(branchName),
    },
    {
      type: "item",
      id: "branch:delete",
      label: `Удалить ветку '${branchName}'…`,
      commandHint: `git branch -d ${branchName}`,
      danger: true,
      disabled: isCurrent,
      disabledReason: isCurrent ? "Нельзя удалить текущую ветку" : undefined,
      run: () => callbacks.onDelete(branchName),
    },
    {
      type: "item",
      id: "branch:delete-on-remote",
      label: `Удалить ветку '${branchName}' на remote…`,
      commandHint: `git push origin --delete ${branchName}`,
      danger: true,
      disabled: !upstream,
      disabledReason: !upstream ? "У ветки нет связанного remote" : isProtected ? "Защищённая ветка" : undefined,
      run: () => callbacks.onDeleteOnRemote(branchName),
    },
  ];
}
