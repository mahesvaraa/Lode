import type { MenuItem } from "@/ui";
import {
  buildRemoteMenu,
  buildTagMenu,
  buildStashMenu,
  buildSidebarSectionMenu,
  buildRepoHeaderMenu,
  buildStateBannerMenu,
  buildEmptyHistoryMenu,
} from "@/menus";
import {
  deleteTag,
  fetch as apiFetch,
  applyStash,
  popStash,
  dropStash,
  removeRemote,
  abortMerge,
  continueOperation,
  showInFileManager,
  openInTerminal,
} from "@/api/client";
import { useRepoStore } from "@/store/repoStore";
import { useUiStore } from "@/store/uiStore";
import type { MenuHandlerContext } from "./handlerContext";

export function handleRemoteContextMenu(
  remoteName: string,
  element: HTMLElement,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;

  return buildRemoteMenu(
    remoteName,
    repoContext,
    {
      onFetch: async (r: string) => {
        await apiFetch(currentRepo.path, false, r);
        await refreshAll();
        showToast(`Fetch '${r}' выполнен`);
      },
      onFetchPrune: async (r: string) => {
        await apiFetch(currentRepo.path, true, r);
        await refreshAll();
        showToast(`Fetch --prune '${r}' выполнен`);
      },
      onEditUrl: (r: string) => {
        dialogs.setEditRemoteUrlModal({
          isOpen: true,
          remoteName: r,
          currentUrl: element.dataset.remoteUrl || "",
        });
      },
      onRemove: (r: string) => {
        dialogs.setConfirmModal({
          isOpen: true,
          title: `Удалить remote '${r}'`,
          message: `Вы уверены, что хотите удалить удалённый репозиторий '${r}'?`,
          danger: true,
          confirmLabel: "Удалить remote",
          onConfirm: async () => {
            try {
              await removeRemote(currentRepo.path, r);
              await refreshAll();
              showToast(`Remote '${r}' удалён`);
            } catch (err: unknown) {
              const errObj = err as { message?: string };
              showToast(errObj.message || "Ошибка удаления remote", "error");
            }
          },
        });
      },
      showToast,
    },
    element.dataset.remoteUrl
  );
}

export function handleTagContextMenu(
  tagName: string,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;

  return buildTagMenu(tagName, repoContext, {
    onCheckout: (_tName: string) => showToast(`Checkout тега '${_tName}'`),
    onCreateBranch: (startPoint: string) =>
      dialogs.setBranchModal({ isOpen: true, startPoint }),
    onPushTag: (_tName: string) => showToast(`Push тега '${_tName}'`),
    onDeleteLocally: (tName: string) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: `Удалить тег '${tName}'`,
        message: `Удалить тег '${tName}' локально?`,
        danger: true,
        confirmLabel: "Удалить тег",
        onConfirm: async () => {
          await deleteTag(currentRepo.path, tName);
          await refreshAll();
          showToast(`Тег '${tName}' удалён`);
        },
      });
    },
    onDeleteOnRemote: (tName: string) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Удалить тег на remote",
        message: `Удалить тег '${tName}' на удалённом сервере?`,
        danger: true,
        confirmLabel: "Удалить на сервере",
        onConfirm: async () => {
          showToast(`Тег '${tName}' удалён на remote`);
        },
      });
    },
    showToast,
  });
}

export function handleStashContextMenu(
  stashIndexStr: string,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;
  const stashIdx = parseInt(stashIndexStr, 10) || 0;

  return buildStashMenu(stashIdx, repoContext, {
    onApply: async (idx: number) => {
      await applyStash(currentRepo.path, `stash@{${idx}}`);
      await refreshAll();
      showToast(`Stash@{${idx}} применён`);
    },
    onPop: async (idx: number) => {
      await popStash(currentRepo.path, `stash@{${idx}}`);
      await refreshAll();
      showToast(`Stash@{${idx}} извлечён`);
    },
    onBranch: (idx: number) =>
      dialogs.setBranchModal({ isOpen: true, startPoint: `stash@{${idx}}` }),
    onViewDiff: (_idx: number) => {
      useUiStore.getState().setStashModalOpen(true);
    },
    onDrop: (idx: number) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: `Удалить stash@{${idx}}`,
        message: `Вы уверены, что хотите удалить запись stash@{${idx}}?`,
        danger: true,
        confirmLabel: "Удалить stash",
        onConfirm: async () => {
          await dropStash(currentRepo.path, `stash@{${idx}}`);
          await refreshAll();
          showToast(`Stash@{${idx}} удалён`);
        },
      });
    },
    showToast,
  });
}

export function handleSidebarSectionContextMenu(
  sectionId: string,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { dialogs, refreshAll, showToast } = ctx;

  return buildSidebarSectionMenu(sectionId, {
    onCreateItem: (sId: string) => {
      if (sId === "branches") {
        dialogs.setBranchModal({ isOpen: true, startPoint: "HEAD" });
      } else if (sId === "tags") {
        dialogs.setTagModal({ isOpen: true, targetHash: "HEAD" });
      } else {
        showToast(`Создание в '${sId}'`);
      }
    },
    onRefresh: () => refreshAll(),
  });
}

export function handleRepoHeaderContextMenu(
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, showToast } = ctx;

  return buildRepoHeaderMenu(currentRepo.path, {
    onShowInFileManager: async (p: string) => {
      await showInFileManager(p);
    },
    onOpenInTerminal: async (p: string) => {
      await openInTerminal(p);
    },
    onCopyPath: () => {
      showToast("Путь к репозиторию скопирован");
    },
    onCloseRepo: () => {
      useRepoStore.getState().closeRepo();
    },
  });
}

export function handleStateBannerContextMenu(
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;
  if (!repoContext.repoState) return [];

  const stateKind = repoContext.repoState.kind;

  return buildStateBannerMenu(repoContext.repoState, {
    onContinue: async () => {
      await continueOperation(currentRepo.path);
      await refreshAll();
      showToast("Операция продолжена");
    },
    onSkip: () => showToast("Коммит пропущен"),
    onAbort: () => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: `Отменить операцию (${stateKind})`,
        message: `Вы уверены, что хотите отменить текущую операцию ${stateKind}? Все неразрешённые изменения будут сброшены.`,
        danger: true,
        confirmLabel: "Отменить операцию",
        onConfirm: async () => {
          await abortMerge(currentRepo.path);
          await refreshAll();
          showToast("Операция отменена");
        },
      });
    },
  });
}

export function handleEmptyHistoryContextMenu(
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, refreshAll, showToast } = ctx;

  return buildEmptyHistoryMenu({
    onRefresh: () => refreshAll(),
    onFetch: async () => {
      await apiFetch(currentRepo.path);
      await refreshAll();
      showToast("Fetch выполнен");
    },
    onJumpToHead: () => {},
  });
}
