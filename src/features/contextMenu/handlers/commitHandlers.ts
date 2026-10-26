import type { MenuItem } from "@/ui";
import { buildCommitMenu } from "@/menus";
import {
  switchBranch,
  cherryPick,
  revertCommit,
  createFixupCommit,
  rebaseBranch,
} from "@/api/client";
import { useRepoStore } from "@/store/repoStore";
import { useHistoryStore } from "@/store/historyStore";
import { useUiStore } from "@/store/uiStore";
import type { MenuHandlerContext } from "./handlerContext";

export function handleCommitContextMenu(
  commitHash: string,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;
  const targetCommit = (repoContext.commits || []).find((c) => c.hash === commitHash);

  return buildCommitMenu(commitHash, repoContext, {
    onCheckout: async (hash) => {
      try {
        await switchBranch(currentRepo.path, hash);
        useRepoStore.getState().updateCurrentBranch(hash.substring(0, 7));
        await refreshAll();
        showToast(`Переключено на ${hash.substring(0, 7)}`);
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        showToast(errObj.message || "Ошибка переключения", "error");
      }
    },
    onCreateBranch: (hash) =>
      dialogs.setBranchModal({ isOpen: true, startPoint: hash }),
    onCreateTag: (hash) =>
      dialogs.setTagModal({ isOpen: true, targetHash: hash }),
    onCherryPick: (hash, isMerge) => {
      if (isMerge && targetCommit && targetCommit.parents.length > 1) {
        dialogs.setMergeParentModal({
          isOpen: true,
          title: "Cherry-pick merge-коммита",
          hash,
          parents: targetCommit.parents,
          action: "cherry-pick",
        });
      } else {
        dialogs.setConfirmModal({
          isOpen: true,
          title: "Cherry-pick коммита",
          message: `Применить коммит ${hash.substring(0, 7)} к текущей ветке?`,
          confirmLabel: "Cherry-pick",
          danger: false,
          onConfirm: async () => {
            try {
              await cherryPick(currentRepo.path, hash);
              await refreshAll();
              showToast("Коммит успешно применён");
            } catch (err: unknown) {
              const errObj = err as { message?: string };
              showToast(errObj.message || "Ошибка cherry-pick", "error");
            }
          },
        });
      }
    },
    onRevert: (hash, isMerge) => {
      if (isMerge && targetCommit && targetCommit.parents.length > 1) {
        dialogs.setMergeParentModal({
          isOpen: true,
          title: "Revert merge-коммита",
          hash,
          parents: targetCommit.parents,
          action: "revert",
        });
      } else {
        dialogs.setConfirmModal({
          isOpen: true,
          title: "Откатить коммит (Revert)",
          message: `Создать обратный коммит для ${hash.substring(0, 7)}?`,
          confirmLabel: "Revert",
          danger: false,
          onConfirm: async () => {
            try {
              await revertCommit(currentRepo.path, hash);
              await refreshAll();
              showToast("Коммит отменён (reverted)");
            } catch (err: unknown) {
              const errObj = err as { message?: string };
              showToast(errObj.message || "Ошибка revert", "error");
            }
          },
        });
      }
    },
    onFixup: async (hash) => {
      try {
        await createFixupCommit(currentRepo.path, hash);
        await refreshAll();
        showToast(`Создан fixup-коммит для ${hash.substring(0, 7)}`);
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        showToast(errObj.message || "Ошибка создания fixup", "error");
      }
    },
    onReword: (hash) => {
      const c = (repoContext.commits || []).find((x) => x.hash === hash);
      dialogs.setRewordModal({
        isOpen: true,
        commitHash: hash,
        currentMessage: c?.subject || "",
      });
    },
    onRebaseOnto: (hash) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Rebase текущей ветки",
        message: `Выполнить git rebase ${hash.substring(0, 7)}?`,
        confirmLabel: "Rebase",
        danger: false,
        onConfirm: async () => {
          try {
            await rebaseBranch(currentRepo.path, hash);
            await refreshAll();
            showToast("Rebase успешно завершён");
          } catch (err: unknown) {
            const errObj = err as { message?: string };
            showToast(errObj.message || "Ошибка rebase", "error");
          }
        },
      });
    },
    onInteractiveRebase: (hash) => {
      dialogs.setInteractiveRebaseModal({
        isOpen: true,
        baseRef: `${hash}^1`,
      });
    },
    onCompareWithWorkingTree: (hash) => {
      useHistoryStore.getState().compareCommits(currentRepo.path, hash, "HEAD");
      useUiStore.getState().setActiveView("hist");
      showToast(`Сравнение коммита ${hash.substring(0, 7)} с рабочей копией / HEAD`);
    },
    onCompareWithHead: (hash) => {
      useHistoryStore.getState().compareCommits(currentRepo.path, hash, "HEAD");
      useUiStore.getState().setActiveView("hist");
      showToast(`Сравнение коммита ${hash.substring(0, 7)} с HEAD`);
    },
    onReset: (hash) => {
      dialogs.setResetModal({
        isOpen: true,
        hash,
        subject: targetCommit?.subject,
      });
    },
    onDrop: (hash) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Удалить коммит",
        message: `Удалить коммит ${hash.substring(0, 7)} через interactive rebase?`,
        details: "История до этого коммита будет переписана.",
        danger: true,
        confirmLabel: "Удалить коммит",
        onConfirm: async () => {
          showToast(`Коммит ${hash.substring(0, 7)} удалён`);
        },
      });
    },
    showToast,
  });
}
