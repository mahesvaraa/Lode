import React, { useEffect, useState } from "react";
import { useUiStore, type ActiveView } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useRemoteStore } from "@/store/remoteStore";
import { useStashStore } from "@/store/stashStore";
import { useWorktreeStore } from "@/store/worktreeStore";
import { useSubmoduleStore } from "@/store/submoduleStore";
import { useI18n } from "@/lib/i18n";
import type { GitRef } from "@/api/types/git_ref";
import type { WorktreeInfo } from "@/api/types/worktree_info";
import { BranchesSection } from "@/features/sidebar/BranchesSection";
import { RemotesSection } from "@/features/sidebar/RemotesSection";
import { TagsSection } from "@/features/sidebar/TagsSection";
import { StashesSection } from "@/features/sidebar/StashesSection";
import { WorktreesSection } from "@/features/sidebar/WorktreesSection";
import { SubmodulesSection } from "@/features/sidebar/SubmodulesSection";
import { SidebarModals } from "@/features/sidebar/SidebarModals";

export const Sidebar: React.FC = () => {
  const { t } = useI18n();
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);

  const currentRepo = useRepoStore((s) => s.currentRepo);
  const openRepository = useRepoStore((s) => s.openRepository);

  const status = useStatusStore((s) => s.status);
  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadHistory = useHistoryStore((s) => s.loadInitial);

  const refs = useRefsStore((s) => s.refs);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const createBranch = useRefsStore((s) => s.createBranch);
  const switchBranch = useRefsStore((s) => s.switchBranch);
  const renameBranch = useRefsStore((s) => s.renameBranch);
  const deleteBranch = useRefsStore((s) => s.deleteBranch);
  const createTag = useRefsStore((s) => s.createTag);
  const deleteTag = useRefsStore((s) => s.deleteTag);
  const mergeBranch = useRefsStore((s) => s.mergeBranch);

  const loadRemotes = useRemoteStore((s) => s.loadRemotes);
  const isRemoteModalOpen = useUiStore((s) => s.isRemoteModalOpen);
  const setRemoteModalOpen = useUiStore((s) => s.setRemoteModalOpen);

  const stashes = useStashStore((s) => s.stashes);
  const loadStashes = useStashStore((s) => s.loadStashes);
  const isStashModalOpen = useUiStore((s) => s.isStashModalOpen);
  const setStashModalOpen = useUiStore((s) => s.setStashModalOpen);

  const worktrees = useWorktreeStore((s) => s.worktrees);
  const loadWorktrees = useWorktreeStore((s) => s.loadWorktrees);
  const createWorktreeAction = useWorktreeStore((s) => s.createWorktree);
  const deleteWorktreeAction = useWorktreeStore((s) => s.deleteWorktree);

  const submodules = useSubmoduleStore((s) => s.submodules);
  const loadSubmodules = useSubmoduleStore((s) => s.loadSubmodules);
  const syncSubmodules = useSubmoduleStore((s) => s.syncSubmodules);
  const initializeSubmodule = useSubmoduleStore((s) => s.initializeSubmodule);
  const isSyncingSubmodules = useSubmoduleStore((s) => s.isLoading);

  // Modal visibility states
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [switchToNewBranch, setSwitchToNewBranch] = useState(true);

  const [branchToRename, setBranchToRename] = useState<GitRef | null>(null);
  const [renamedBranchName, setRenamedBranchName] = useState("");

  const [branchToDelete, setBranchToDelete] = useState<GitRef | null>(null);
  const [forceDeleteBranch, setForceDeleteBranch] = useState(false);

  const [branchToMerge, setBranchToMerge] = useState<GitRef | null>(null);

  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagMessage, setNewTagMessage] = useState("");
  const [tagToDelete, setTagToDelete] = useState<GitRef | null>(null);

  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [showStashModal, setShowStashModal] = useState(false);

  const [showCreateWorktree, setShowCreateWorktree] = useState(false);
  const [worktreeToDelete, setWorktreeToDelete] = useState<WorktreeInfo | null>(null);
  const [forceDeleteWorktree, setForceDeleteWorktree] = useState(false);

  useEffect(() => {
    if (currentRepo) {
      loadRefs(currentRepo.path);
      loadRepoState(currentRepo.path);
      loadRemotes(currentRepo.path);
      loadStashes(currentRepo.path);
      loadWorktrees(currentRepo.path);
      loadSubmodules(currentRepo.path);
    }
  }, [currentRepo, loadRefs, loadRepoState, loadRemotes, loadStashes, loadWorktrees, loadSubmodules]);

  const refreshAll = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadRefs(currentRepo.path),
      loadStatus(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadHistory(currentRepo.path),
      loadRemotes(currentRepo.path),
      loadStashes(currentRepo.path),
      loadWorktrees(currentRepo.path),
      loadSubmodules(currentRepo.path),
    ]);
  };

  const handleCreateBranch = async () => {
    if (!currentRepo || !newBranchName.trim()) return;
    try {
      await createBranch(currentRepo.path, newBranchName.trim(), undefined, switchToNewBranch);
      setShowCreateBranch(false);
      setNewBranchName("");
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const handleSwitchBranch = async (name: string) => {
    if (!currentRepo) return;
    try {
      await switchBranch(currentRepo.path, name);
      useRepoStore.getState().updateCurrentBranch(name);
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const handleRenameBranch = async () => {
    if (!currentRepo || !branchToRename || !renamedBranchName.trim()) return;
    try {
      await renameBranch(currentRepo.path, branchToRename.name, renamedBranchName.trim());
      setBranchToRename(null);
      setRenamedBranchName("");
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const handleDeleteBranch = async () => {
    if (!currentRepo || !branchToDelete) return;
    try {
      await deleteBranch(currentRepo.path, branchToDelete.name, forceDeleteBranch);
      setBranchToDelete(null);
      setForceDeleteBranch(false);
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const handleMergeBranch = async () => {
    if (!currentRepo || !branchToMerge) return;
    try {
      await mergeBranch(currentRepo.path, branchToMerge.name);
      setBranchToMerge(null);
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const handleCreateTag = async () => {
    if (!currentRepo || !newTagName.trim()) return;
    try {
      await createTag(currentRepo.path, newTagName.trim(), "HEAD", newTagMessage.trim() || undefined);
      setShowCreateTag(false);
      setNewTagName("");
      setNewTagMessage("");
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const handleDeleteTag = async () => {
    if (!currentRepo || !tagToDelete) return;
    try {
      await deleteTag(currentRepo.path, tagToDelete.name);
      setTagToDelete(null);
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const handleCreateWorktree = async (path: string, branch?: string, newBranch?: string) => {
    if (!currentRepo) return;
    await createWorktreeAction(currentRepo.path, path, branch, newBranch);
    setShowCreateWorktree(false);
    await refreshAll();
  };

  const handleDeleteWorktree = async () => {
    if (!currentRepo || !worktreeToDelete) return;
    try {
      await deleteWorktreeAction(currentRepo.path, worktreeToDelete.path, forceDeleteWorktree);
      setWorktreeToDelete(null);
      setForceDeleteWorktree(false);
      await refreshAll();
    } catch {
      // error in store
    }
  };

  const stagedCount = status?.staged.length || 0;
  const unstagedCount = status?.unstaged.length || 0;
  const totalChanges = stagedCount + unstagedCount;
  const conflictsCount = status?.conflicts.length || 0;

  const navItems: {
    id: ActiveView;
    label: string;
    badge?: string | number;
    badgeWarning?: boolean;
  }[] = [
    { id: "hist", label: t.sidebar.history },
    {
      id: "chg",
      label: t.sidebar.changes,
      badge: totalChanges > 0 ? totalChanges : undefined,
    },
    {
      id: "conf",
      label: t.sidebar.conflicts,
      badge: conflictsCount > 0 ? conflictsCount : undefined,
      badgeWarning: conflictsCount > 0,
    },
  ];

  const currentBranchName = refs?.current_branch || status?.branch.head || "main";

  return (
    <aside
      style={{
        width: `${sidebarWidth}px`,
        backgroundColor: "var(--bg2)",
        display: "flex",
        flexDirection: "column",
        padding: "10px 8px",
        overflow: "auto",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* Top Nav: History, Changes, Conflicts */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveView(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveView(item.id);
                }
              }}
              className={`nav ${isActive ? "on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 8px",
                borderRadius: "var(--radius-base)",
                cursor: "pointer",
                color: isActive ? "var(--tx)" : "var(--mut)",
                backgroundColor: isActive ? "var(--sel)" : "transparent",
                fontSize: "var(--font-size-base)",
                fontWeight: isActive ? 500 : 400,
                transition: "background-color 0.1s, color 0.1s",
              }}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <b
                  style={{
                    marginLeft: "auto",
                    fontWeight: 500,
                    fontSize: "var(--font-size-xs)",
                    backgroundColor: item.badgeWarning ? "var(--del)" : "var(--bg3)",
                    color: item.badgeWarning ? "#fff" : "var(--tx)",
                    borderRadius: "9px",
                    padding: "0 6px",
                    lineHeight: "16px",
                  }}
                >
                  {item.badge}
                </b>
              )}
            </div>
          );
        })}
      </div>

      {/* Branches Section */}
      <BranchesSection
        refs={refs}
        onOpenCreateModal={() => setShowCreateBranch(true)}
        onSwitchBranch={handleSwitchBranch}
      />

      {/* Remote Branches Section */}
      <RemotesSection
        refs={refs}
        onOpenRemoteModal={() => setShowRemoteModal(true)}
      />

      {/* Tags Section */}
      <TagsSection
        refs={refs}
        onOpenCreateTag={() => setShowCreateTag(true)}
        onSelectTagToDelete={setTagToDelete}
      />

      {/* Stash Section */}
      <StashesSection
        stashes={stashes}
        onOpenStashModal={() => setShowStashModal(true)}
      />

      {/* Worktrees Section */}
      <WorktreesSection
        worktrees={worktrees}
        currentRepoPath={currentRepo?.path}
        onOpenCreateWorktree={() => setShowCreateWorktree(true)}
        onSelectWorktree={(path) => openRepository(path)}
        onSelectWorktreeToDelete={setWorktreeToDelete}
      />

      {/* Submodules Section */}
      <SubmodulesSection
        submodules={submodules}
        isSyncing={isSyncingSubmodules}
        onSyncSubmodules={async () => {
          if (!currentRepo) return;
          await syncSubmodules(currentRepo.path, true, true);
          await refreshAll();
        }}
        onSelectSubmodule={(sub) => {
          const subRepoPath = currentRepo
            ? `${currentRepo.path.replace(/[\\/]+$/, "")}/${sub.path.replace(/^[\\/]+/, "")}`
            : sub.path;
          openRepository(subRepoPath);
        }}
        onInitializeSubmodule={async (path) => {
          if (!currentRepo) return;
          await initializeSubmodule(currentRepo.path, path);
          await refreshAll();
        }}
      />

      {/* Modals */}
      <SidebarModals
        currentBranchName={currentBranchName}
        localBranches={refs?.local_branches || []}
        showCreateBranch={showCreateBranch}
        onCloseCreateBranch={() => setShowCreateBranch(false)}
        newBranchName={newBranchName}
        setNewBranchName={setNewBranchName}
        switchToNewBranch={switchToNewBranch}
        setSwitchToNewBranch={setSwitchToNewBranch}
        onConfirmCreateBranch={handleCreateBranch}
        branchToRename={branchToRename}
        onCloseRenameBranch={() => setBranchToRename(null)}
        renamedBranchName={renamedBranchName}
        setRenamedBranchName={setRenamedBranchName}
        onConfirmRenameBranch={handleRenameBranch}
        branchToDelete={branchToDelete}
        onCloseDeleteBranch={() => setBranchToDelete(null)}
        forceDeleteBranch={forceDeleteBranch}
        setForceDeleteBranch={setForceDeleteBranch}
        onConfirmDeleteBranch={handleDeleteBranch}
        branchToMerge={branchToMerge}
        onCloseMergeBranch={() => setBranchToMerge(null)}
        onConfirmMergeBranch={handleMergeBranch}
        showCreateTag={showCreateTag}
        onCloseCreateTag={() => setShowCreateTag(false)}
        newTagName={newTagName}
        setNewTagName={setNewTagName}
        newTagMessage={newTagMessage}
        setNewTagMessage={setNewTagMessage}
        onConfirmCreateTag={handleCreateTag}
        tagToDelete={tagToDelete}
        onCloseDeleteTag={() => setTagToDelete(null)}
        onConfirmDeleteTag={handleDeleteTag}
        showCreateWorktree={showCreateWorktree}
        onCloseCreateWorktree={() => setShowCreateWorktree(false)}
        onConfirmCreateWorktree={handleCreateWorktree}
        worktreeToDelete={worktreeToDelete}
        onCloseDeleteWorktree={() => {
          setWorktreeToDelete(null);
          setForceDeleteWorktree(false);
        }}
        forceDeleteWorktree={forceDeleteWorktree}
        setForceDeleteWorktree={setForceDeleteWorktree}
        onConfirmDeleteWorktree={handleDeleteWorktree}
        showRemoteModal={showRemoteModal || isRemoteModalOpen}
        onCloseRemoteModal={() => {
          setShowRemoteModal(false);
          setRemoteModalOpen(false);
        }}
        showStashModal={showStashModal || isStashModalOpen}
        onCloseStashModal={() => {
          setShowStashModal(false);
          setStashModalOpen(false);
        }}
      />
    </aside>
  );
};
