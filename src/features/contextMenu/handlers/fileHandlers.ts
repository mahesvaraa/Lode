import type { MenuItem } from "@/ui";
import {
  buildWorkingFileMenu,
  buildCommitFileMenu,
  buildHunkMenu,
  buildBlameLineMenu,
  buildConflictBlockMenu,
} from "@/menus";
import {
  stageFile,
  unstageFile,
  discardFile,
  stageHunk,
  unstageHunk,
  discardHunk,
  openInExternalEditor,
  showInFileManager,
  restoreFileFromCommit,
  stashSave,
} from "@/api/client";
import { useUiStore } from "@/store/uiStore";
import { useHistoryStore } from "@/store/historyStore";
import { useConflictStore } from "@/store/conflictStore";
import type { MenuHandlerContext } from "./handlerContext";

export function handleWorkingFileContextMenu(
  filePath: string,
  element: HTMLElement,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;

  const isStaged = element.dataset.staged === "true";
  const isUntracked = element.dataset.untracked === "true";
  const isConflicted = element.dataset.conflicted === "true";

  return buildWorkingFileMenu(
    filePath,
    { isStaged, isUntracked, isConflicted },
    repoContext,
    {
      onStageFile: async (p) => {
        await stageFile(currentRepo.path, p);
        await refreshAll();
        showToast(`Файл добавлен: ${p}`);
      },
      onUnstageFile: async (p) => {
        await unstageFile(currentRepo.path, p);
        await refreshAll();
        showToast(`Файл убран из индекса: ${p}`);
      },
      onDiscardFile: (p, untracked) => {
        dialogs.setConfirmModal({
          isOpen: true,
          title: "Сбросить изменения",
          message: `Сбросить все изменения в файле '${p}'?`,
          details: "Все незакоммиченные правки будут безвозвратно удалены.",
          danger: true,
          confirmLabel: "Сбросить изменения",
          onConfirm: async () => {
            await discardFile(currentRepo.path, p, untracked);
            await refreshAll();
            showToast(`Изменения сброшены: ${p}`);
          },
        });
      },
      onStashFileOnly: async (p) => {
        try {
          await stashSave(currentRepo.path, `Stash file: ${p}`, true, [p]);
          await refreshAll();
          showToast(`Файл сохранён в stash: ${p}`);
        } catch (err: unknown) {
          const errObj = err as { message?: string };
          showToast(errObj.message || "Ошибка сохранения в stash", "error");
        }
      },
      onViewHistory: (p) => {
        dialogs.setBlameModal({ isOpen: true, filePath: p, initialTab: "history" });
      },
      onViewBlame: (p) => {
        dialogs.setBlameModal({ isOpen: true, filePath: p, initialTab: "blame" });
      },
      onAddToGitignore: (pattern) => showToast(`Добавлено в .gitignore: ${pattern}`),
      onDeleteUntracked: (p) => {
        dialogs.setConfirmModal({
          isOpen: true,
          title: "Удалить неотслеживаемый файл",
          message: `Удалить файл '${p}' с диска?`,
          danger: true,
          confirmLabel: "Удалить",
          onConfirm: async () => {
            await discardFile(currentRepo.path, p, true);
            await refreshAll();
            showToast(`Файл удалён: ${p}`);
          },
        });
      },
      onOpenConflictEditor: (p) => {
        useConflictStore.getState().selectConflictFile(currentRepo.path, p);
        useUiStore.getState().setActiveView("conf");
      },
      onTakeVersion: async (p, ver) => {
        try {
          await useConflictStore.getState().resolveByChoice(
            currentRepo.path,
            p,
            ver === "ours" ? "ours" : "theirs"
          );
          await refreshAll();
          showToast(`Версия '${ver}' успешно применена`);
        } catch (err: unknown) {
          const errObj = err as { message?: string };
          showToast(errObj.message || "Ошибка применения версии", "error");
        }
      },
      onMarkResolved: async (p) => {
        await stageFile(currentRepo.path, p);
        await refreshAll();
        showToast(`Файл отмечен решённым: ${p}`);
      },
      onOpenExternalEditor: async (p) => {
        await openInExternalEditor(currentRepo.path, p);
      },
      onShowInFileManager: async (p) => {
        await showInFileManager(currentRepo.path, p);
      },
      showToast,
    }
  );
}

export function handleCommitFileContextMenu(
  filePath: string,
  element: HTMLElement,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, repoContext, dialogs, refreshAll, showToast } = ctx;
  const cHash = element.dataset.commitHash || "HEAD";

  return buildCommitFileMenu(filePath, cHash, repoContext, {
    onOpenDiff: (p, h) => {
      useHistoryStore.getState().selectCommit(currentRepo.path, h);
      useHistoryStore.getState().selectCommitFile(currentRepo.path, p);
      useUiStore.getState().setActiveView("hist");
    },
    onViewHistory: (p) => {
      dialogs.setBlameModal({ isOpen: true, filePath: p, initialTab: "history" });
    },
    onViewBlame: (p, _h) => {
      dialogs.setBlameModal({ isOpen: true, filePath: p, initialTab: "blame" });
    },
    onRestoreFromCommit: (p, h) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Восстановить версию файла",
        message: `Восстановить файл '${p}' из коммита ${h.substring(0, 7)}?`,
        details: "Текущая рабочая копия файла будет перезаписана.",
        danger: true,
        confirmLabel: "Восстановить",
        onConfirm: async () => {
          try {
            await restoreFileFromCommit(currentRepo.path, h, p);
            await refreshAll();
            showToast(`Файл восстановлен из ${h.substring(0, 7)}`);
          } catch (err: unknown) {
            const errObj = err as { message?: string };
            showToast(errObj.message || "Ошибка восстановления файла", "error");
          }
        },
      });
    },
    onShowInFileManager: async (p) => {
      await showInFileManager(currentRepo.path, p);
    },
    showToast,
  });
}

export function handleHunkContextMenu(
  filePath: string,
  element: HTMLElement,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, dialogs, refreshAll, showToast } = ctx;
  const hIdx = parseInt(element.dataset.hunkIndex || "0", 10);
  const isStaged = element.dataset.staged === "true";

  return buildHunkMenu(filePath, hIdx, isStaged, {
    onStageHunk: async (p, idx) => {
      await stageHunk(currentRepo.path, p, idx);
      await refreshAll();
      showToast("Фрагмент добавлен в индекс");
    },
    onUnstageHunk: async (p, idx) => {
      await unstageHunk(currentRepo.path, p, idx);
      await refreshAll();
      showToast("Фрагмент убран из индекса");
    },
    onDiscardHunk: (p, idx) => {
      dialogs.setConfirmModal({
        isOpen: true,
        title: "Сбросить фрагмент",
        message: `Сбросить изменения в этом фрагменте файла '${p}'?`,
        danger: true,
        confirmLabel: "Сбросить фрагмент",
        onConfirm: async () => {
          await discardHunk(currentRepo.path, p, idx);
          await refreshAll();
          showToast("Фрагмент сброшен");
        },
      });
    },
    onCopyPatch: (_p, _idx) => showToast("Патч скопирован в буфер"),
  });
}

export function handleBlameLineContextMenu(
  commitHash: string,
  element: HTMLElement,
  ctx: MenuHandlerContext
): MenuItem[] {
  const { currentRepo, dialogs, showToast } = ctx;
  const lNo = parseInt(element.dataset.lineNo || "1", 10);
  const bPath = element.dataset.path || "";

  return buildBlameLineMenu(lNo, commitHash, bPath, {
    onShowCommit: (h) => {
      useHistoryStore.getState().selectCommit(currentRepo.path, h);
      useUiStore.getState().setActiveView("hist");
    },
    onBlamePrevious: (_h, p) => {
      dialogs.setBlameModal({ isOpen: true, filePath: p, initialTab: "blame" });
    },
    showToast,
  });
}

export function handleConflictBlockContextMenu(
  blockIndexStr: string,
  element: HTMLElement
): MenuItem[] {
  const bIdx = parseInt(blockIndexStr, 10) || 0;
  const leftL = element.dataset.leftLabel || "Текущая ветка";
  const rightL = element.dataset.rightLabel || "Вливаемая ветка";

  return buildConflictBlockMenu(
    bIdx,
    { left: leftL, right: rightL },
    {
      onTakeLeft: (idx) => {
        useConflictStore.getState().setCurrentBlockIndex(idx);
        useConflictStore.getState().applyBlockChoice("ours");
      },
      onTakeRight: (idx) => {
        useConflictStore.getState().setCurrentBlockIndex(idx);
        useConflictStore.getState().applyBlockChoice("theirs");
      },
      onTakeBothLeftFirst: (idx) => {
        useConflictStore.getState().setCurrentBlockIndex(idx);
        useConflictStore.getState().applyBlockChoice("both-ours-theirs");
      },
      onTakeBothRightFirst: (idx) => {
        useConflictStore.getState().setCurrentBlockIndex(idx);
        useConflictStore.getState().applyBlockChoice("both-theirs-ours");
      },
      onRevertBlock: (idx) => {
        useConflictStore.getState().setCurrentBlockIndex(idx);
        useConflictStore.getState().applyBlockChoice("base");
      },
    }
  );
}
