import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";

export interface CommitMenuCallbacks {
  onCheckout: (hash: string) => void;
  onCreateBranch: (startHash: string) => void;
  onCreateTag: (hash: string) => void;
  onCherryPick: (hash: string, isMerge: boolean) => void;
  onRevert: (hash: string, isMerge: boolean) => void;
  onFixup: (hash: string) => void;
  onReword: (hash: string) => void;
  onRebaseOnto: (hash: string) => void;
  onInteractiveRebase: (hash: string) => void;
  onCompareWithWorkingTree: (hash: string) => void;
  onCompareWithHead: (hash: string) => void;
  onCompareTwoCommits?: (hashA: string, hashB: string) => void;
  onReset: (hash: string) => void;
  onDrop: (hash: string) => void;
  onCherryPickSelected?: (hashes: string[]) => void;
  onSquashSelected?: (hashes: string[]) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildCommitMenu(
  targetHash: string,
  context: RepoContext,
  callbacks: CommitMenuCallbacks
): MenuItem[] {
  const shortHash = targetHash.substring(0, 7);
  const selectedHashes = context.selectedCommitHashes || [targetHash];
  const isMultiSelect = selectedHashes.length > 1;

  // Multi-select commit menu
  if (isMultiSelect) {
    return [
      {
        type: "header",
        label: `Выбрано коммитов: ${selectedHashes.length}`,
      },
      {
        type: "item",
        id: "commit:multi-cherry-pick",
        label: `Cherry-pick выбранных (${selectedHashes.length})`,
        commandHint: `git cherry-pick ... (${selectedHashes.length} commits)`,
        disabled: Boolean(context.repoState && context.repoState.kind !== "Normal"),
        disabledReason: "Идёт другая операция Git",
        run: () => {
          callbacks.onCherryPickSelected?.(selectedHashes);
        },
      },
      {
        type: "item",
        id: "commit:multi-squash",
        label: `Squash выбранных (${selectedHashes.length})…`,
        commandHint: "git rebase -i --autosquash",
        disabled: Boolean(context.repoState && context.repoState.kind !== "Normal"),
        disabledReason: "Идёт другая операция Git",
        run: () => {
          callbacks.onSquashSelected?.(selectedHashes);
        },
      },
      {
        type: "item",
        id: "commit:multi-compare",
        label: "Сравнить эти два коммита",
        disabled: selectedHashes.length !== 2,
        disabledReason: "Сравнение возможно ровно для двух коммитов",
        run: () => {
          if (selectedHashes.length === 2) {
            callbacks.onCompareTwoCommits?.(selectedHashes[0], selectedHashes[1]);
          }
        },
      },
      { type: "separator" },
      {
        type: "item",
        id: "commit:multi-copy-shas",
        label: "Копировать все SHA",
        run: async () => {
          await navigator.clipboard.writeText(selectedHashes.join("\n"));
          callbacks.showToast(`Скопировано ${selectedHashes.length} SHA`);
        },
      },
    ];
  }

  // Single commit menu
  const commit = context.commits?.find((c) => c.hash === targetHash);
  const isMerge = (commit?.parents.length || 0) > 1;
  const isRoot = (commit?.parents.length || 0) === 0;
  const isHead = context.status?.branch?.oid === targetHash;
  const isStateActive = Boolean(context.repoState && context.repoState.kind !== "Normal");
  const hasStaged = (context.status?.staged.length || 0) > 0;

  return [
    // 1. Navigation
    {
      type: "item",
      id: "commit:checkout",
      label: `Checkout этого коммита (${shortHash})`,
      commandHint: `git switch --detach ${shortHash}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт активная операция Git" : undefined,
      run: () => callbacks.onCheckout(targetHash),
    },
    {
      type: "item",
      id: "commit:create-branch",
      label: "Создать ветку отсюда…",
      commandHint: `git switch -c <name> ${shortHash}`,
      run: () => callbacks.onCreateBranch(targetHash),
    },
    {
      type: "item",
      id: "commit:create-tag",
      label: "Создать тег…",
      commandHint: `git tag <name> ${shortHash}`,
      run: () => callbacks.onCreateTag(targetHash),
    },
    { type: "separator" },

    // 2. Application
    {
      type: "item",
      id: "commit:cherry-pick",
      label: "Cherry-pick",
      commandHint: isMerge
        ? `git cherry-pick -m 1 ${shortHash}`
        : `git cherry-pick ${shortHash}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git (merge/rebase/etc.)" : undefined,
      run: () => callbacks.onCherryPick(targetHash, isMerge),
    },
    {
      type: "item",
      id: "commit:revert",
      label: "Revert коммита",
      commandHint: isMerge
        ? `git revert --no-edit -m 1 ${shortHash}`
        : `git revert --no-edit ${shortHash}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onRevert(targetHash, isMerge),
    },
    {
      type: "item",
      id: "commit:fixup",
      label: "Создать fixup-коммит из индекса",
      commandHint: `git commit --fixup=${shortHash}`,
      disabled: !hasStaged || isStateActive,
      disabledReason: !hasStaged
        ? "В индексе нет файлов для fixup"
        : "Идёт операция Git",
      run: () => callbacks.onFixup(targetHash),
    },
    { type: "separator" },

    // 3. Rewriting
    {
      type: "item",
      id: "commit:reword",
      label: isHead ? "Изменить сообщение (amend)…" : "Изменить сообщение (reword)…",
      commandHint: isHead ? "git commit --amend" : `git rebase -i ${shortHash}^`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onReword(targetHash),
    },
    {
      type: "item",
      id: "commit:rebase-onto",
      label: `Rebase текущей ветки на ${shortHash}`,
      commandHint: `git rebase ${shortHash}`,
      disabled: isStateActive || isHead,
      disabledReason: isHead ? "Текущая ветка уже указывает на этот коммит" : undefined,
      run: () => callbacks.onRebaseOnto(targetHash),
    },
    {
      type: "item",
      id: "commit:interactive-rebase",
      label: "Интерактивный rebase отсюда…",
      commandHint: `git rebase -i ${isRoot ? "--root" : `${shortHash}^`}`,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onInteractiveRebase(targetHash),
    },
    { type: "separator" },

    // 4. Comparison
    {
      type: "item",
      id: "commit:compare-worktree",
      label: "Сравнить с рабочим каталогом",
      commandHint: `git diff ${shortHash}`,
      run: () => callbacks.onCompareWithWorkingTree(targetHash),
    },
    {
      type: "item",
      id: "commit:compare-head",
      label: "Сравнить с HEAD",
      commandHint: `git diff HEAD..${shortHash}`,
      disabled: isHead,
      disabledReason: isHead ? "Этот коммит и есть HEAD" : undefined,
      run: () => callbacks.onCompareWithHead(targetHash),
    },
    { type: "separator" },

    // 5. Copying
    {
      type: "item",
      id: "commit:copy-submenu",
      label: "Копировать",
      children: [
        {
          type: "item",
          id: "commit:copy-full-sha",
          label: "Полный SHA",
          shortcut: "Ctrl+C",
          run: async () => {
            await navigator.clipboard.writeText(targetHash);
            callbacks.showToast(`SHA скопирован: ${shortHash}`);
          },
        },
        {
          type: "item",
          id: "commit:copy-short-sha",
          label: "Короткий SHA (7 символов)",
          run: async () => {
            await navigator.clipboard.writeText(shortHash);
            callbacks.showToast(`Короткий SHA скопирован: ${shortHash}`);
          },
        },
        {
          type: "item",
          id: "commit:copy-message",
          label: "Сообщение коммита",
          disabled: !commit?.subject,
          run: async () => {
            if (commit) {
              const fullMsg = commit.body
                ? `${commit.subject}\n\n${commit.body}`
                : commit.subject;
              await navigator.clipboard.writeText(fullMsg);
              callbacks.showToast("Сообщение коммита скопировано");
            }
          },
        },
        {
          type: "item",
          id: "commit:copy-author",
          label: "Имя и email автора",
          disabled: !commit?.author_name,
          run: async () => {
            if (commit) {
              await navigator.clipboard.writeText(
                `${commit.author_name} <${commit.author_email}>`
              );
              callbacks.showToast("Автор скопирован");
            }
          },
        },
      ],
    },
    { type: "separator" },

    // 6. Dangerous actions (Red / Bottom)
    {
      type: "item",
      id: "commit:reset",
      label: "Reset текущей ветки сюда…",
      commandHint: `git reset --mixed/--hard ${shortHash}`,
      danger: true,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onReset(targetHash),
    },
    {
      type: "item",
      id: "commit:drop",
      label: "Удалить этот коммит (Drop)…",
      commandHint: `git rebase --onto ${shortHash}^ ${shortHash}`,
      danger: true,
      disabled: isStateActive,
      disabledReason: isStateActive ? "Идёт операция Git" : undefined,
      run: () => callbacks.onDrop(targetHash),
    },
  ];
}
