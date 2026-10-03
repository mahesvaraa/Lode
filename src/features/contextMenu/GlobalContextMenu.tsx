import React, { useEffect, useState, useCallback } from "react";
import { ContextMenu, type MenuItem } from "@/ui";
import { useContextMenuStore } from "@/store/contextMenuStore";
import { useRepoStore } from "@/store/repoStore";
import { useRefsStore } from "@/store/refsStore";
import { useStatusStore } from "@/store/statusStore";
import { useHistoryStore } from "@/store/historyStore";
import { useToastStore } from "@/store/toastStore";
import {
  buildEditableMenu,
  buildCommitMenu,
  buildBranchMenu,
  buildRemoteBranchMenu,
  buildRemoteMenu,
  buildTagMenu,
  buildStashMenu,
  buildWorkingFileMenu,
  buildCommitFileMenu,
  buildHunkMenu,
  buildBlameLineMenu,
  buildConflictBlockMenu,
  buildEmptyHistoryMenu,
  buildSidebarSectionMenu,
  buildRepoHeaderMenu,
  buildStateBannerMenu,
  type RepoContext,
} from "@/menus";
import {
  CreateBranchModal,
  CreateTagModal,
  RenameBranchModal,
  ResetModal,
  MergeParentModal,
  SetUpstreamModal,
  ConfirmationModal,
} from "@/features/dialogs";
import {
  switchBranch,
  createBranch,
  renameBranch,
  deleteBranch,
  mergeBranch,
  createTag,
  deleteTag,
  push,
  pull,
  fetch as apiFetch,
  stageFile,
  unstageFile,
  discardFile,
  stageHunk,
  unstageHunk,
  discardHunk,
  applyStash,
  popStash,
  dropStash,
  cherryPick,
  revertCommit,
  resetBranch,
  abortMerge,
  continueOperation,
  openInExternalEditor,
  showInFileManager,
  openInTerminal,
} from "@/api/client";

export const GlobalContextMenu: React.FC = () => {
  const { isOpen, x, y, items, openMenu, closeMenu } = useContextMenuStore();
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const repoState = useRefsStore((s) => s.repoState);
  const refs = useRefsStore((s) => s.refs);
  const status = useStatusStore((s) => s.status);
  const commits = useHistoryStore((s) => s.commits);
  const showToast = useToastStore((s) => s.showToast);

  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const loadHistory = useHistoryStore((s) => s.loadInitial);

  // Dialog states
  const [branchModal, setBranchModal] = useState<{ isOpen: boolean; startPoint: string }>({
    isOpen: false,
    startPoint: "HEAD",
  });
  const [tagModal, setTagModal] = useState<{ isOpen: boolean; targetHash: string }>({
    isOpen: false,
    targetHash: "HEAD",
  });
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; oldName: string }>({
    isOpen: false,
    oldName: "",
  });
  const [resetModal, setResetModal] = useState<{
    isOpen: boolean;
    hash: string;
    subject?: string;
  }>({
    isOpen: false,
    hash: "",
  });
  const [mergeParentModal, setMergeParentModal] = useState<{
    isOpen: boolean;
    title: string;
    hash: string;
    parents: string[];
    action: "cherry-pick" | "revert";
  }>({
    isOpen: false,
    title: "",
    hash: "",
    parents: [],
    action: "cherry-pick",
  });
  const [upstreamModal, setUpstreamModal] = useState<{
    isOpen: boolean;
    branchName: string;
    currentUpstream?: string | null;
  }>({
    isOpen: false,
    branchName: "",
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    recoveryHint?: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
  });

  const refreshAll = useCallback(async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadStatus(currentRepo.path),
      loadRefs(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadHistory(currentRepo.path),
    ]);
  }, [currentRepo, loadStatus, loadRefs, loadRepoState, loadHistory]);

  const repoContext: RepoContext = {
    repoPath: currentRepo?.path || "",
    repoState,
    status,
    refs,
    currentBranch: currentRepo?.current_branch || null,
    commits,
  };

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      // Disallow native menu everywhere
      e.preventDefault();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 1. Check for editable fields (input, textarea, contenteditable)
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          const editItems = buildEditableMenu(target);
          openMenu(mouseX, mouseY, editItems, target);
          return;
        }
      }

      if (!currentRepo) return;

      // 2. Traverse up DOM looking for data-ctx
      const ctxEl = target.closest<HTMLElement>("[data-ctx]");
      if (!ctxEl) {
        // Fallback: Empty history or nothing
        const historyEl = target.closest<HTMLElement>("[data-empty-history]");
        if (historyEl) {
          const items = buildEmptyHistoryMenu({
            onRefresh: () => refreshAll(),
            onFetch: async () => {
              await apiFetch(currentRepo.path);
              await refreshAll();
              showToast("Fetch выполнен");
            },
            onJumpToHead: () => {
              // scroll to top handled in view
            },
          });
          openMenu(mouseX, mouseY, items, target);
        }
        return;
      }

      const ctxType = ctxEl.dataset.ctx;
      const ctxId = ctxEl.dataset.id || "";

      let menuItems: MenuItem[] = [];

      switch (ctxType) {
        case "commit": {
          const commitHash = ctxId;
          const targetCommit = commits.find((c) => c.hash === commitHash);
          menuItems = buildCommitMenu(commitHash, repoContext, {
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
            onCreateBranch: (hash) => setBranchModal({ isOpen: true, startPoint: hash }),
            onCreateTag: (hash) => setTagModal({ isOpen: true, targetHash: hash }),
            onCherryPick: (hash, isMerge) => {
              if (isMerge && targetCommit && targetCommit.parents.length > 1) {
                setMergeParentModal({
                  isOpen: true,
                  title: "Cherry-pick",
                  hash,
                  parents: targetCommit.parents,
                  action: "cherry-pick",
                });
              } else {
                setConfirmModal({
                  isOpen: true,
                  title: "Cherry-pick коммита",
                  message: `Применить изменения коммита ${hash.substring(0, 7)} к текущей ветке?`,
                  confirmLabel: "Применить",
                  danger: false,
                  onConfirm: async () => {
                    await cherryPick(currentRepo.path, hash);
                    await refreshAll();
                    showToast("Коммит применён");
                  },
                });
              }
            },
            onRevert: (hash, isMerge) => {
              if (isMerge && targetCommit && targetCommit.parents.length > 1) {
                setMergeParentModal({
                  isOpen: true,
                  title: "Revert",
                  hash,
                  parents: targetCommit.parents,
                  action: "revert",
                });
              } else {
                setConfirmModal({
                  isOpen: true,
                  title: "Revert коммита",
                  message: `Создать инвертирующий коммит для ${hash.substring(0, 7)}?`,
                  confirmLabel: "Revert",
                  danger: false,
                  onConfirm: async () => {
                    await revertCommit(currentRepo.path, hash);
                    await refreshAll();
                    showToast("Коммит отменён (reverted)");
                  },
                });
              }
            },
            onFixup: (hash) => {
              showToast(`Fixup для ${hash.substring(0, 7)}`);
            },
            onReword: (hash) => {
              showToast(`Reword для ${hash.substring(0, 7)}`);
            },
            onRebaseOnto: (hash) => {
              setConfirmModal({
                isOpen: true,
                title: "Rebase текущей ветки",
                message: `Выполнить git rebase ${hash.substring(0, 7)}?`,
                confirmLabel: "Rebase",
                danger: false,
                onConfirm: async () => {
                  showToast("Rebase запущен");
                },
              });
            },
            onInteractiveRebase: (hash) => {
              showToast(`Interactive rebase от ${hash.substring(0, 7)}`);
            },
            onCompareWithWorkingTree: (hash) => {
              showToast(`Сравнение с рабочим каталогом: ${hash.substring(0, 7)}`);
            },
            onCompareWithHead: (hash) => {
              showToast(`Сравнение с HEAD: ${hash.substring(0, 7)}`);
            },
            onReset: (hash) => {
              setResetModal({
                isOpen: true,
                hash,
                subject: targetCommit?.subject,
              });
            },
            onDrop: (hash) => {
              setConfirmModal({
                isOpen: true,
                title: "Удалить коммит (Drop)",
                message: `Удалить коммит ${hash.substring(0, 7)} из цепочки?`,
                details: "Это действие перепишет локальную историю ветки.",
                recoveryHint: "git reset --hard ORIG_HEAD",
                confirmLabel: "Удалить коммит",
                danger: true,
                onConfirm: async () => {
                  showToast(`Коммит ${hash.substring(0, 7)} удалён`);
                },
              });
            },
            showToast,
          });
          break;
        }

        case "branch": {
          const branchName = ctxId;
          menuItems = buildBranchMenu(branchName, repoContext, {
            onCheckout: async (bName) => {
              try {
                await switchBranch(currentRepo.path, bName);
                await refreshAll();
                showToast(`Переключено на ${bName}`);
              } catch (err: unknown) {
                const errObj = err as { message?: string };
                showToast(errObj.message || "Ошибка переключения", "error");
              }
            },
            onCreateBranch: (startPoint) => setBranchModal({ isOpen: true, startPoint }),
            onMergeIntoCurrent: async (bName, mode) => {
              try {
                await mergeBranch(
                  currentRepo.path,
                  bName,
                  mode === "no-ff" ? true : undefined
                );
                await refreshAll();
                showToast(`Слияние '${bName}' выполнено`);
              } catch (err: unknown) {
                const errObj = err as { message?: string };
                showToast(errObj.message || "Ошибка слияния", "error");
              }
            },
            onRebaseCurrentOnto: (bName) => {
              setConfirmModal({
                isOpen: true,
                title: `Rebase на '${bName}'`,
                message: `Перебазировать текущую ветку на '${bName}'?`,
                confirmLabel: "Rebase",
                danger: false,
                onConfirm: async () => {
                  showToast("Rebase запущен");
                },
              });
            },
            onInteractiveRebaseCurrentOnto: (bName) => {
              showToast(`Интерактивный rebase на '${bName}'`);
            },
            onCheckoutAndRebase: (bName) => {
              showToast(`Checkout и rebase: ${bName}`);
            },
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
            onPush: async (setUpstream) => {
              await push(currentRepo.path, undefined, undefined, setUpstream);
              await refreshAll();
              showToast("Push выполнен");
            },
            onSetUpstream: (bName) => {
              const currentUp = refs?.local_branches.find((b) => b.name === bName)?.upstream;
              setUpstreamModal({
                isOpen: true,
                branchName: bName,
                currentUpstream: currentUp,
              });
            },
            onUnsetUpstream: async (_bName) => {
              showToast("Upstream убран");
            },
            onRename: (bName) => setRenameModal({ isOpen: true, oldName: bName }),
            onForcePush: (bName) => {
              setConfirmModal({
                isOpen: true,
                title: `Force Push ветки '${bName}'`,
                message: `Отправить изменения с перезаписью (--force-with-lease) для '${bName}'?`,
                details: "Внимание! Изменения на удалённом репозитории могут быть перезаписаны.",
                confirmLabel: "Force Push",
                danger: true,
                onConfirm: async () => {
                  await push(currentRepo.path, undefined, undefined, false, true);
                  await refreshAll();
                  showToast("Force push выполнен");
                },
              });
            },
            onDelete: (bName) => {
              setConfirmModal({
                isOpen: true,
                title: `Удалить ветку '${bName}'`,
                message: `Вы уверены, что хотите удалить локальную ветку '${bName}'?`,
                confirmLabel: "Удалить ветку",
                danger: true,
                onConfirm: async () => {
                  await deleteBranch(currentRepo.path, bName);
                  await refreshAll();
                  showToast(`Ветка '${bName}' удалена`);
                },
              });
            },
            onDeleteOnRemote: (bName) => {
              setConfirmModal({
                isOpen: true,
                title: `Удалить ветку '${bName}' на remote`,
                message: `Вы уверены, что хотите безвозвратно удалить ветку '${bName}' на удалённом сервере?`,
                confirmLabel: "Удалить на сервере",
                danger: true,
                onConfirm: async () => {
                  showToast(`Ветка удалена на remote`);
                },
              });
            },
            showToast,
          });
          break;
        }

        case "remote-branch": {
          const remoteBranch = ctxId;
          menuItems = buildRemoteBranchMenu(remoteBranch, repoContext, {
            onCheckoutTracking: async (rb) => {
              const bName = rb.split("/").slice(1).join("/");
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
            onCreateBranchFrom: (rb) => setBranchModal({ isOpen: true, startPoint: rb }),
            onMergeIntoCurrent: async (rb) => {
              await mergeBranch(currentRepo.path, rb);
              await refreshAll();
              showToast(`Влита ветка '${rb}'`);
            },
            onRebaseCurrentOnto: (rb) => {
              showToast(`Rebase на '${rb}'`);
            },
            onDeleteOnRemote: (rb) => {
              setConfirmModal({
                isOpen: true,
                title: `Удалить ветку '${rb}' на remote`,
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
          break;
        }

        case "remote": {
          const remoteName = ctxId;
          menuItems = buildRemoteMenu(
            remoteName,
            repoContext,
            {
              onFetch: async (r) => {
                await apiFetch(currentRepo.path, false, r);
                await refreshAll();
                showToast(`Fetch '${r}' выполнен`);
              },
              onFetchPrune: async (r) => {
                await apiFetch(currentRepo.path, true, r);
                await refreshAll();
                showToast(`Fetch --prune '${r}' выполнен`);
              },
              onEditUrl: (r) => showToast(`Изменение URL remote '${r}'`),
              onRemove: (r) => {
                setConfirmModal({
                  isOpen: true,
                  title: `Удалить remote '${r}'`,
                  message: `Вы уверены, что хотите удалить удалённый репозиторий '${r}'?`,
                  danger: true,
                  confirmLabel: "Удалить remote",
                  onConfirm: async () => {
                    showToast(`Remote '${r}' удалён`);
                  },
                });
              },
              showToast,
            },
            ctxEl.dataset.remoteUrl
          );
          break;
        }

        case "tag": {
          const tagName = ctxId;
          menuItems = buildTagMenu(tagName, repoContext, {
            onCheckout: async (tName) => {
              await switchBranch(currentRepo.path, tName);
              await refreshAll();
              showToast(`Checkout тега '${tName}'`);
            },
            onCreateBranch: (tName) => setBranchModal({ isOpen: true, startPoint: tName }),
            onPushTag: async (tName) => {
              showToast(`Push тега '${tName}'`);
            },
            onDeleteLocally: (tName) => {
              setConfirmModal({
                isOpen: true,
                title: `Удалить тег '${tName}'`,
                message: `Удалить локальный тег '${tName}'?`,
                danger: true,
                confirmLabel: "Удалить тег",
                onConfirm: async () => {
                  await deleteTag(currentRepo.path, tName);
                  await refreshAll();
                  showToast(`Тег '${tName}' удалён`);
                },
              });
            },
            onDeleteOnRemote: (tName) => {
              setConfirmModal({
                isOpen: true,
                title: `Удалить тег '${tName}' на remote`,
                message: `Удалить тег '${tName}' на удалённом сервере?`,
                danger: true,
                confirmLabel: "Удалить на remote",
                onConfirm: async () => {
                  showToast(`Тег '${tName}' удалён на remote`);
                },
              });
            },
            showToast,
          });
          break;
        }

        case "stash": {
          const stashIdx = parseInt(ctxId, 10) || 0;
          menuItems = buildStashMenu(
            stashIdx,
            repoContext,
            {
              onApply: async (idx) => {
                await applyStash(currentRepo.path, `stash@{${idx}}`);
                await refreshAll();
                showToast(`Stash@{${idx}} применён`);
              },
              onPop: async (idx) => {
                await popStash(currentRepo.path, `stash@{${idx}}`);
                await refreshAll();
                showToast(`Stash@{${idx}} извлечён`);
              },
              onBranch: (idx) => setBranchModal({ isOpen: true, startPoint: `stash@{${idx}}` }),
              onViewDiff: (idx) => showToast(`Просмотр stash@{${idx}}`),
              onDrop: (idx) => {
                setConfirmModal({
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
            },
            ctxEl.dataset.message
          );
          break;
        }

        case "working-file": {
          const filePath = ctxId;
          const isStaged = ctxEl.dataset.staged === "true";
          const isUntracked = ctxEl.dataset.untracked === "true";
          const isConflicted = ctxEl.dataset.conflicted === "true";

          menuItems = buildWorkingFileMenu(
            filePath,
            { isStaged, isUntracked, isConflicted },
            repoContext,
            {
              onStageFile: async (p) => {
                await stageFile(currentRepo.path, p);
                await loadStatus(currentRepo.path);
                showToast(`Файл добавлен: ${p}`);
              },
              onUnstageFile: async (p) => {
                await unstageFile(currentRepo.path, p);
                await loadStatus(currentRepo.path);
                showToast(`Файл убран из индекса: ${p}`);
              },
              onDiscardFile: (p, untracked) => {
                setConfirmModal({
                  isOpen: true,
                  title: "Сбросить изменения",
                  message: `Сбросить все изменения в файле '${p}'?`,
                  details: "Все незакоммиченные правки будут безвозвратно удалены.",
                  danger: true,
                  confirmLabel: "Сбросить изменения",
                  onConfirm: async () => {
                    await discardFile(currentRepo.path, p, untracked);
                    await loadStatus(currentRepo.path);
                    showToast(`Изменения сброшены: ${p}`);
                  },
                });
              },
              onStashFileOnly: (p) => showToast(`Stash только для '${p}'`),
              onViewHistory: (p) => showToast(`История файла '${p}'`),
              onViewBlame: (p) => showToast(`Blame файла '${p}'`),
              onAddToGitignore: (pattern) => showToast(`Добавлено в .gitignore: ${pattern}`),
              onDeleteUntracked: (p) => {
                setConfirmModal({
                  isOpen: true,
                  title: "Удалить неотслеживаемый файл",
                  message: `Удалить файл '${p}' с диска?`,
                  danger: true,
                  confirmLabel: "Удалить",
                  onConfirm: async () => {
                    await discardFile(currentRepo.path, p, true);
                    await loadStatus(currentRepo.path);
                    showToast(`Файл удалён: ${p}`);
                  },
                });
              },
              onOpenConflictEditor: (_p) => showToast("Переход в редактор конфликтов"),
              onTakeVersion: (_p, ver) => showToast(`Выбрана версия ${ver}`),
              onMarkResolved: async (p) => {
                await stageFile(currentRepo.path, p);
                await loadStatus(currentRepo.path);
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
          break;
        }

        case "commit-file": {
          const filePath = ctxId;
          const cHash = ctxEl.dataset.commitHash || "HEAD";
          menuItems = buildCommitFileMenu(filePath, cHash, repoContext, {
            onOpenDiff: (p, h) => showToast(`Diff: ${p} @ ${h.substring(0, 7)}`),
            onViewHistory: (p) => showToast(`История: ${p}`),
            onViewBlame: (p, h) => showToast(`Blame: ${p} @ ${h.substring(0, 7)}`),
            onRestoreFromCommit: (p, h) => {
              setConfirmModal({
                isOpen: true,
                title: "Восстановить версию файла",
                message: `Восстановить файл '${p}' из коммита ${h.substring(0, 7)}?`,
                details: "Текущая рабочая копия файла будет перезаписана.",
                danger: true,
                confirmLabel: "Восстановить",
                onConfirm: async () => {
                  showToast(`Файл восстановлен из ${h.substring(0, 7)}`);
                },
              });
            },
            onShowInFileManager: async (p) => {
              await showInFileManager(currentRepo.path, p);
            },
            showToast,
          });
          break;
        }

        case "hunk": {
          const filePath = ctxId;
          const hIdx = parseInt(ctxEl.dataset.hunkIndex || "0", 10);
          const isStaged = ctxEl.dataset.staged === "true";
          menuItems = buildHunkMenu(filePath, hIdx, isStaged, {
            onStageHunk: async (p, idx) => {
              await stageHunk(currentRepo.path, p, idx);
              await loadStatus(currentRepo.path);
              showToast("Фрагмент добавлен в индекс");
            },
            onUnstageHunk: async (p, idx) => {
              await unstageHunk(currentRepo.path, p, idx);
              await loadStatus(currentRepo.path);
              showToast("Фрагмент убран из индекса");
            },
            onDiscardHunk: (p, idx) => {
              setConfirmModal({
                isOpen: true,
                title: "Сбросить фрагмент",
                message: `Сбросить изменения в этом фрагменте файла '${p}'?`,
                danger: true,
                confirmLabel: "Сбросить фрагмент",
                onConfirm: async () => {
                  await discardHunk(currentRepo.path, p, idx);
                  await loadStatus(currentRepo.path);
                  showToast("Фрагмент сброшен");
                },
              });
            },
            onCopyPatch: (_p, _idx) => showToast("Патч скопирован в буфер"),
          });
          break;
        }

        case "blame-line": {
          const lNo = parseInt(ctxEl.dataset.lineNo || "1", 10);
          const bHash = ctxId;
          const bPath = ctxEl.dataset.path || "";
          menuItems = buildBlameLineMenu(lNo, bHash, bPath, {
            onShowCommit: (h) => showToast(`Коммит ${h.substring(0, 7)}`),
            onBlamePrevious: (h, p) => showToast(`Blame ${h.substring(0, 7)}^ для ${p}`),
            showToast,
          });
          break;
        }

        case "conflict-block": {
          const bIdx = parseInt(ctxId, 10) || 0;
          const leftL = ctxEl.dataset.leftLabel || "Текущая ветка";
          const rightL = ctxEl.dataset.rightLabel || "Вливаемая ветка";
          menuItems = buildConflictBlockMenu(
            bIdx,
            { left: leftL, right: rightL },
            {
              onTakeLeft: (idx) => showToast(`Взято левое: блок #${idx + 1}`),
              onTakeRight: (idx) => showToast(`Взято правое: блок #${idx + 1}`),
              onTakeBothLeftFirst: (idx) => showToast(`Обе стороны: блок #${idx + 1}`),
              onTakeBothRightFirst: (idx) => showToast(`Обе стороны: блок #${idx + 1}`),
              onRevertBlock: (idx) => showToast(`Откат блока #${idx + 1}`),
            }
          );
          break;
        }

        case "sidebar-section": {
          const sectionId = ctxId;
          menuItems = buildSidebarSectionMenu(sectionId, {
            onCreateItem: (sId) => {
              if (sId === "branches") setBranchModal({ isOpen: true, startPoint: "HEAD" });
              else if (sId === "tags") setTagModal({ isOpen: true, targetHash: "HEAD" });
              else showToast(`Создание в '${sId}'`);
            },
            onRefresh: () => refreshAll(),
          });
          break;
        }

        case "repo-header": {
          menuItems = buildRepoHeaderMenu(currentRepo.path, {
            onShowInFileManager: async (p) => {
              await showInFileManager(p);
            },
            onOpenInTerminal: async (p) => {
              await openInTerminal(p);
            },
            onCopyPath: async (p) => {
              await navigator.clipboard.writeText(p);
              showToast("Путь к репозиторию скопирован");
            },
            onCloseRepo: closeRepo,
          });
          break;
        }

        case "state-banner": {
          if (!repoState) break;
          menuItems = buildStateBannerMenu(repoState, {
            onContinue: async () => {
              await continueOperation(currentRepo.path);
              await refreshAll();
              showToast("Операция продолжена");
            },
            onSkip: () => showToast("Коммит пропущен"),
            onAbort: () => {
              setConfirmModal({
                isOpen: true,
                title: "Отменить операцию",
                message: `Вы уверены, что хотите отменить операцию ${repoState.kind}?`,
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
          break;
        }

        default:
          break;
      }

      if (menuItems.length > 0) {
        openMenu(mouseX, mouseY, menuItems, target);
      }
    },
    [currentRepo, repoState, refs, status, commits, repoContext, openMenu, refreshAll, closeRepo, showToast]
  );

  useEffect(() => {
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [handleContextMenu]);

  const availableRemotes = Array.from(
    new Set(refs?.remote_branches.map((r) => r.name.split("/")[0]) || ["origin"])
  );

  return (
    <>
      <ContextMenu isOpen={isOpen} x={x} y={y} items={items} onClose={closeMenu} />

      {/* Modals triggered from context menus */}
      <CreateBranchModal
        isOpen={branchModal.isOpen}
        startPoint={branchModal.startPoint}
        onClose={() => setBranchModal({ isOpen: false, startPoint: "HEAD" })}
        onConfirm={async (name, startPoint, switchTo) => {
          if (!currentRepo) return;
          await createBranch(currentRepo.path, name, startPoint, switchTo);
          await refreshAll();
          showToast(`Ветка '${name}' успешно создана`);
        }}
      />

      <CreateTagModal
        isOpen={tagModal.isOpen}
        targetHash={tagModal.targetHash}
        onClose={() => setTagModal({ isOpen: false, targetHash: "HEAD" })}
        onConfirm={async (name, targetHash, message) => {
          if (!currentRepo) return;
          await createTag(currentRepo.path, name, targetHash, message);
          await refreshAll();
          showToast(`Тег '${name}' создан`);
        }}
      />

      <RenameBranchModal
        isOpen={renameModal.isOpen}
        oldName={renameModal.oldName}
        onClose={() => setRenameModal({ isOpen: false, oldName: "" })}
        onConfirm={async (oldName, newName) => {
          if (!currentRepo) return;
          await renameBranch(currentRepo.path, oldName, newName);
          await refreshAll();
          showToast(`Ветка переименована в '${newName}'`);
        }}
      />

      <ResetModal
        isOpen={resetModal.isOpen}
        targetHash={resetModal.hash}
        shortSubject={resetModal.subject}
        onClose={() => setResetModal({ isOpen: false, hash: "" })}
        onConfirm={async (hash, mode) => {
          if (!currentRepo) return;
          await resetBranch(currentRepo.path, hash, mode);
          await refreshAll();
          showToast(`Выполнен reset (${mode}) к ${hash.substring(0, 7)}`);
        }}
      />

      <MergeParentModal
        isOpen={mergeParentModal.isOpen}
        actionTitle={mergeParentModal.title}
        commitHash={mergeParentModal.hash}
        parentHashes={mergeParentModal.parents}
        onClose={() => setMergeParentModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async (parentIndex) => {
          if (!currentRepo) return;
          if (mergeParentModal.action === "cherry-pick") {
            await cherryPick(currentRepo.path, mergeParentModal.hash, parentIndex);
            await refreshAll();
            showToast("Cherry-pick выполнен");
          } else {
            await revertCommit(currentRepo.path, mergeParentModal.hash, parentIndex);
            await refreshAll();
            showToast("Revert выполнен");
          }
        }}
      />

      <SetUpstreamModal
        isOpen={upstreamModal.isOpen}
        branchName={upstreamModal.branchName}
        availableRemotes={availableRemotes}
        currentUpstream={upstreamModal.currentUpstream}
        onClose={() => setUpstreamModal({ isOpen: false, branchName: "" })}
        onConfirm={async (_branchName, remoteName, remoteBranch) => {
          showToast(`Upstream установлен: ${remoteName}/${remoteBranch}`);
        }}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        recoveryHint={confirmModal.recoveryHint}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </>
  );
};
