import { useCallback } from "react";
import type { MenuItem } from "@/ui";
import { useContextMenuStore } from "@/store/contextMenuStore";
import { useRepoStore } from "@/store/repoStore";
import { useRefsStore } from "@/store/refsStore";
import { useStatusStore } from "@/store/statusStore";
import { useHistoryStore } from "@/store/historyStore";
import { useToastStore } from "@/store/toastStore";
import { buildEditableMenu, type RepoContext } from "@/menus";
import type { ContextMenuDialogSetters } from "./ContextMenuModals";
import type { MenuHandlerContext } from "./handlers/handlerContext";
import { handleCommitContextMenu } from "./handlers/commitHandlers";
import {
  handleBranchContextMenu,
  handleRemoteBranchContextMenu,
} from "./handlers/branchHandlers";
import {
  handleWorkingFileContextMenu,
  handleCommitFileContextMenu,
  handleHunkContextMenu,
  handleBlameLineContextMenu,
  handleConflictBlockContextMenu,
} from "./handlers/fileHandlers";
import {
  handleRemoteContextMenu,
  handleTagContextMenu,
  handleStashContextMenu,
  handleSidebarSectionContextMenu,
  handleRepoHeaderContextMenu,
  handleStateBannerContextMenu,
  handleEmptyHistoryContextMenu,
} from "./handlers/remoteRefHandlers";

export function useContextMenuDispatcher(dialogs: ContextMenuDialogSetters) {
  const openMenu = useContextMenuStore((s) => s.openMenu);

  const currentRepo = useRepoStore((s) => s.currentRepo);
  const refs = useRefsStore((s) => s.refs);
  const repoState = useRefsStore((s) => s.repoState);
  const status = useStatusStore((s) => s.status);
  const commits = useHistoryStore((s) => s.commits);
  const showToast = useToastStore((s) => s.showToast);

  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const loadHistory = useHistoryStore((s) => s.loadInitial);

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
      // Disallow native browser context menu
      e.preventDefault();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 1. Text input / textarea / editable fields
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ) {
          const editItems = buildEditableMenu(target);
          openMenu(mouseX, mouseY, editItems, target);
          return;
        }
      }

      if (!currentRepo) return;

      const handlerCtx: MenuHandlerContext = {
        currentRepo,
        repoContext,
        dialogs,
        refreshAll,
        showToast,
      };

      // 2. Traverse up DOM looking for data-ctx
      const ctxEl = target.closest<HTMLElement>("[data-ctx]");
      if (!ctxEl) {
        // Fallback: Empty history context
        const historyEl = target.closest<HTMLElement>("[data-empty-history]");
        if (historyEl) {
          const items = handleEmptyHistoryContextMenu(handlerCtx);
          openMenu(mouseX, mouseY, items, target);
        }
        return;
      }

      const ctxType = ctxEl.dataset.ctx;
      const ctxId = ctxEl.dataset.id || "";
      let menuItems: MenuItem[] = [];

      switch (ctxType) {
        case "commit":
          menuItems = handleCommitContextMenu(ctxId, handlerCtx);
          break;

        case "branch":
          menuItems = handleBranchContextMenu(ctxId, handlerCtx);
          break;

        case "remote-branch":
          menuItems = handleRemoteBranchContextMenu(ctxId, handlerCtx);
          break;

        case "remote":
          menuItems = handleRemoteContextMenu(ctxId, ctxEl, handlerCtx);
          break;

        case "tag":
          menuItems = handleTagContextMenu(ctxId, handlerCtx);
          break;

        case "stash":
          menuItems = handleStashContextMenu(ctxId, handlerCtx);
          break;

        case "working-file":
          menuItems = handleWorkingFileContextMenu(ctxId, ctxEl, handlerCtx);
          break;

        case "commit-file":
          menuItems = handleCommitFileContextMenu(ctxId, ctxEl, handlerCtx);
          break;

        case "hunk":
          menuItems = handleHunkContextMenu(ctxId, ctxEl, handlerCtx);
          break;

        case "blame-line":
          menuItems = handleBlameLineContextMenu(ctxId, ctxEl, handlerCtx);
          break;

        case "conflict-block":
          menuItems = handleConflictBlockContextMenu(ctxId, ctxEl);
          break;

        case "sidebar-section":
          menuItems = handleSidebarSectionContextMenu(ctxId, handlerCtx);
          break;

        case "repo-header":
          menuItems = handleRepoHeaderContextMenu(handlerCtx);
          break;

        case "state-banner":
          menuItems = handleStateBannerContextMenu(handlerCtx);
          break;

        default:
          return;
      }

      if (menuItems.length > 0) {
        openMenu(mouseX, mouseY, menuItems, target);
      }
    },
    [currentRepo, repoContext, dialogs, refreshAll, openMenu, showToast]
  );

  return { handleContextMenu, refreshAll };
}
