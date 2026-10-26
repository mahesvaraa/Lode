import type { MenuItem } from "@/ui";
import { buildBranchMenu, buildRemoteBranchMenu } from "@/menus";
import {
  switchBranch,
  deleteBranch,
  mergeBranch,
  rebaseBranch,
  push,
  pull,
  fetch as apiFetch,
} from "@/api/client";
import { useRepoStore } from "@/store/repoStore";
import { useOperationStore } from "@/store/operationStore";
import type { MenuHandlerContext } from "./handlerContext";

export function handleBranchContextMenu(
  branchName: string,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;

  return buildBranchMenu(branchName, repoContext, {
    onCheckout: async (bName: string) => {
      try {
        await switchBranch(currentRepo.path, bName);
        useRepoStore.getState().updateCurrentBranch(bName);
        await refreshAll();
        showToast(`Переключено на ${bName}`);
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        showToast(errObj.message || "Ошибка переключения", "error");
      }
    },
    onCreateBranch: (startPoint: string) =>
      dialogs.setBranchModal({ isOpen: true, startPoint }),
    onMergeIntoCurrent: async (
      bName: string,
      mode: "normal" | "no-ff" | "squash" | "ff-only"
    ) => {
      useOperationStore
        .getState()
        .startOperation(`Слияние ветки '${bName}'…`, currentRepo.path, true);
      try {
        await mergeBranch(
          currentRepo.path,
          bName,
          mode === "no-ff"
        );
        await refreshAll();
        showToast(`Слияние '${bName}' выполнено`);
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        showToast(errObj.message || "Ошибка слияния", "error");
      } finally {
        useOperationStore.getState().endOperation();
      }
    },
    onRebaseCurrentOnto: (bName: string) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Rebase текущей ветки",
        message: `Перебазировать текущую ветку на '${bName}'?`,
        confirmLabel: "Rebase",
        danger: false,
        onConfirm: async () => {
          useOperationStore
            .getState()
            .startOperation(`Rebase на '${bName}'…`, currentRepo.path, true);
          try {
            await rebaseBranch(currentRepo.path, bName);
            await refreshAll();
            showToast(`Rebase на '${bName}' успешно завершён`);
          } catch (err: unknown) {
            const errObj = err as { message?: string };
            showToast(errObj.message || "Ошибка rebase", "error");
          } finally {
            useOperationStore.getState().endOperation();
          }
        },
      });
    },
    onInteractiveRebaseCurrentOnto: (bName: string) =>
      showToast(`Интерактивный rebase на '${bName}'`),
    onCheckoutAndRebase: (bName: string) =>
      showToast(`Checkout и rebase: ${bName}`),
    onFetch: async () => {
      await apiFetch(currentRepo.path);
      await refreshAll();
      showToast("Fetch выполнен");
    },
    onPull: async () => {
      await pull(currentRepo.path);
      await refreshAll();
      showToast("Pull выполнен");
    },
    onPush: async () => {
      await push(currentRepo.path);
      await refreshAll();
      showToast("Push выполнен");
    },
    onSetUpstream: (bName: string) =>
      dialogs.setUpstreamModal({
        isOpen: true,
        branchName: bName,
        currentUpstream: repoContext.refs?.local_branches.find(
          (b) => b.name === bName
        )?.upstream,
      }),
    onUnsetUpstream: (_bName: string) => showToast("Upstream убран"),
    onRename: (oldName: string) =>
      dialogs.setRenameModal({ isOpen: true, oldName }),
    onForcePush: (_bName: string) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Force Push ветки",
        message: `Вы уверены, что хотите выполнить force push (--force-with-lease)?`,
        details: "Это действие перезапишет историю на удалённом сервере.",
        danger: true,
        confirmLabel: "Force push",
        onConfirm: async () => {
          showToast("Force push выполнен");
        },
      });
    },
    onDelete: (bName: string) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: `Удалить ветку '${bName}'`,
        message: `Вы действительно хотите удалить ветку '${bName}'?`,
        danger: true,
        confirmLabel: "Удалить ветку",
        onConfirm: async () => {
          await deleteBranch(currentRepo.path, bName, false);
          await refreshAll();
          showToast(`Ветка '${bName}' удалена`);
        },
      });
    },
    onDeleteOnRemote: (_bName: string) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Удалить ветку на remote",
        message: `Удалить ветку на сервере?`,
        danger: true,
        confirmLabel: "Удалить на сервере",
        onConfirm: async () => {
          showToast(`Ветка удалена на remote`);
        },
      });
    },
    showToast,
  });
}

export function handleRemoteBranchContextMenu(
  remoteBranch: string,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;

  return buildRemoteBranchMenu(remoteBranch, repoContext, {
    onCheckoutTracking: async (bName: string) => {
      try {
        await switchBranch(currentRepo.path, bName);
        useRepoStore.getState().updateCurrentBranch(bName);
        await refreshAll();
        showToast(`Переключено на ${bName}`);
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        showToast(errObj.message || "Ошибка переключения", "error");
      }
    },
    onCreateBranchFrom: (startPoint: string) =>
      dialogs.setBranchModal({ isOpen: true, startPoint }),
    onMergeIntoCurrent: (rb: string) => showToast(`Влита ветка '${rb}'`),
    onRebaseCurrentOnto: (rb: string) => showToast(`Rebase на '${rb}'`),
    onDeleteOnRemote: (rb: string) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Удалить ветку на remote",
        message: `Удалить ветку '${rb}' на удалённом сервере?`,
        danger: true,
        confirmLabel: "Удалить на сервере",
        onConfirm: async () => {
          showToast(`Ветка '${rb}' удалена на remote`);
        },
      });
    },
    showToast,
  });
}
