import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoState } from "@/api/types/repo_state";

export interface StateBannerMenuCallbacks {
  onContinue: () => void;
  onSkip?: () => void;
  onAbort: () => void;
}

export function buildStateBannerMenu(
  state: RepoState,
  callbacks: StateBannerMenuCallbacks
): MenuItem[] {
  const isRebase = state.kind === "Rebase";

  return [
    {
      type: "item",
      id: "state:continue",
      label: `Продолжить ${state.kind} (--continue)`,
      commandHint: isRebase ? "git rebase --continue" : "git merge --continue",
      run: () => callbacks.onContinue(),
    },
    ...(isRebase && callbacks.onSkip
      ? [
          {
            type: "item" as const,
            id: "state:skip",
            label: "Пропустить текущий коммит (--skip)",
            commandHint: "git rebase --skip",
            run: () => callbacks.onSkip?.(),
          },
        ]
      : []),
    { type: "separator" },
    {
      type: "item",
      id: "state:abort",
      label: `Отменить операцию ${state.kind} (--abort)…`,
      commandHint: isRebase ? "git rebase --abort" : "git merge --abort",
      danger: true,
      run: () => callbacks.onAbort(),
    },
  ];
}
