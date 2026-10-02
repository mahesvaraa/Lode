import React, { useEffect, useState } from "react";
import { Button, Checkbox, Input, Modal } from "@/ui";
import { useUiStore, type ActiveView } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useRemoteStore } from "@/store/remoteStore";
import { RemoteModal } from "@/features/remote/RemoteModal";
import { t } from "@/lib/i18n";
import type { GitRef } from "@/api/types/git_ref";

export const Sidebar: React.FC = () => {
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);

  const currentRepo = useRepoStore((s) => s.currentRepo);
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

  // Modals state
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

  const loadRemotes = useRemoteStore((s) => s.loadRemotes);

  useEffect(() => {
    if (currentRepo) {
      loadRefs(currentRepo.path);
      loadRepoState(currentRepo.path);
      loadRemotes(currentRepo.path);
    }
  }, [currentRepo, loadRefs, loadRepoState, loadRemotes]);

  const refreshAll = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadRefs(currentRepo.path),
      loadStatus(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadHistory(currentRepo.path),
      loadRemotes(currentRepo.path),
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
      await createTag(currentRepo.path, newTagName.trim(), undefined, newTagMessage.trim() || undefined);
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

      {/* Local Branches Section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "16px 8px 6px",
        }}
      >
        <h6
          style={{
            margin: 0,
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--mut)",
          }}
        >
          {t.sidebar.branches}
        </h6>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreateBranch(true)}
          style={{ padding: "1px 6px", fontSize: "11px" }}
          title="Создать новую ветку"
        >
          +
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {refs?.local_branches.map((branch) => {
          const isCurrent = branch.is_head;
          const tracking =
            branch.ahead > 0 || branch.behind > 0
              ? `${branch.ahead > 0 ? `↑${branch.ahead}` : ""} ${branch.behind > 0 ? `↓${branch.behind}` : ""}`.trim()
              : undefined;

          return (
            <div
              key={branch.name}
              onClick={() => !isCurrent && handleSwitchBranch(branch.name)}
              className="row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "var(--radius-base)",
                fontSize: "var(--font-size-base)",
                color: isCurrent ? "var(--tx)" : "var(--mut)",
                backgroundColor: isCurrent ? "var(--sel)" : "transparent",
                fontWeight: isCurrent ? 600 : 400,
                cursor: isCurrent ? "default" : "pointer",
              }}
              title={isCurrent ? "Текущая ветка" : `Переключиться на ${branch.name}`}
            >
              <span style={{ color: isCurrent ? "var(--acc)" : "transparent", fontSize: "10px" }}>
                ●
              </span>

              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {branch.name}
              </span>

              {tracking && (
                <span className="mono" style={{ fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
                  {tracking}
                </span>
              )}

              {/* Action buttons on hover */}
              <div
                style={{ display: "flex", gap: "2px" }}
                onClick={(e) => e.stopPropagation()}
              >
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title={`Влить ${branch.name} в ${currentBranchName}`}
                    onClick={() => setBranchToMerge(branch)}
                    style={{ padding: "0 4px", fontSize: "11px" }}
                  >
                    🔀
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  title="Переименовать ветку"
                  onClick={() => {
                    setBranchToRename(branch);
                    setRenamedBranchName(branch.name);
                  }}
                  style={{ padding: "0 4px", fontSize: "11px" }}
                >
                  ✏
                </Button>
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Удалить ветку"
                    onClick={() => setBranchToDelete(branch)}
                    style={{ padding: "0 4px", fontSize: "11px" }}
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Remote Branches Section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "16px 8px 6px",
        }}
      >
        <h6
          style={{
            margin: 0,
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--mut)",
          }}
        >
          {t.sidebar.remotes}
        </h6>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowRemoteModal(true)}
          style={{ padding: "1px 6px", fontSize: "11px" }}
          title="Управление удалёнными репозиториями"
        >
          ⚙
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {refs?.remote_branches.length === 0 ? (
          <div style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            (нет remote)
          </div>
        ) : (
          refs?.remote_branches.map((remote) => (
            <div
              key={remote.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                fontSize: "var(--font-size-sm)",
                color: "var(--mut)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={remote.name}
            >
              <span style={{ fontSize: "11px" }}>🌐</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {remote.name}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Tags Section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "16px 8px 6px",
        }}
      >
        <h6
          style={{
            margin: 0,
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--mut)",
          }}
        >
          {t.sidebar.tags}
        </h6>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreateTag(true)}
          style={{ padding: "1px 6px", fontSize: "11px" }}
          title="Создать тег"
        >
          +
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {refs?.tags.length === 0 ? (
          <div style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            (нет тегов)
          </div>
        ) : (
          refs?.tags.map((tag) => (
            <div
              key={tag.name}
              className="row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                borderRadius: "var(--radius-base)",
                fontSize: "var(--font-size-sm)",
                color: "var(--tx)",
              }}
            >
              <span style={{ fontSize: "11px" }}>🏷</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tag.name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                title="Удалить тег"
                onClick={() => setTagToDelete(tag)}
                style={{ padding: "0 4px", fontSize: "11px" }}
              >
                ✕
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Create Branch Modal */}
      <Modal
        isOpen={showCreateBranch}
        onClose={() => setShowCreateBranch(false)}
        title="Создать ветку"
        confirmLabel="Создать"
        onConfirm={handleCreateBranch}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginBottom: "4px" }}>
              Имя ветки
            </label>
            <Input
              placeholder="feature/new-feature"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              autoFocus
            />
          </div>
          <Checkbox
            label="Переключиться на ветку сразу"
            checked={switchToNewBranch}
            onChange={(e) => setSwitchToNewBranch(e.target.checked)}
          />
        </div>
      </Modal>

      {/* Rename Branch Modal */}
      <Modal
        isOpen={branchToRename !== null}
        onClose={() => setBranchToRename(null)}
        title={`Переименовать ветку ${branchToRename?.name}`}
        confirmLabel="Переименовать"
        onConfirm={handleRenameBranch}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "12px", color: "var(--mut)" }}>Новое имя ветки</label>
          <Input
            value={renamedBranchName}
            onChange={(e) => setRenamedBranchName(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Branch Modal */}
      <Modal
        isOpen={branchToDelete !== null}
        onClose={() => setBranchToDelete(null)}
        title={`Удалить ветку ${branchToDelete?.name}?`}
        confirmLabel="Удалить ветку"
        isDanger={true}
        onConfirm={handleDeleteBranch}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Вы уверены, что хотите удалить ветку <b>{branchToDelete?.name}</b>?
          </p>
          <Checkbox
            label="Принудительное удаление (-D)"
            checked={forceDeleteBranch}
            onChange={(e) => setForceDeleteBranch(e.target.checked)}
          />
        </div>
      </Modal>

      {/* Merge Confirmation Modal */}
      <Modal
        isOpen={branchToMerge !== null}
        onClose={() => setBranchToMerge(null)}
        title="Слияние веток"
        confirmLabel={`Влить ${branchToMerge?.name} в ${currentBranchName}`}
        onConfirm={handleMergeBranch}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Ветка <b>{branchToMerge?.name}</b> будет слита в текущую ветку <b>{currentBranchName}</b>.
          Если возникнут конфликты, приложение перейдёт в режим разрешения конфликтов.
        </p>
      </Modal>

      {/* Create Tag Modal */}
      <Modal
        isOpen={showCreateTag}
        onClose={() => setShowCreateTag(false)}
        title="Создать тег"
        confirmLabel="Создать тег"
        onConfirm={handleCreateTag}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginBottom: "4px" }}>
              Имя тега
            </label>
            <Input
              placeholder="v1.0.0"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginBottom: "4px" }}>
              Сообщение тега (опционально, создаст аннотированный тег)
            </label>
            <Input
              placeholder="Релиз версии 1.0.0"
              value={newTagMessage}
              onChange={(e) => setNewTagMessage(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Tag Modal */}
      <Modal
        isOpen={tagToDelete !== null}
        onClose={() => setTagToDelete(null)}
        title={`Удалить тег ${tagToDelete?.name}?`}
        confirmLabel="Удалить тег"
        isDanger={true}
        onConfirm={handleDeleteTag}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы уверены, что хотите удалить тег <b>{tagToDelete?.name}</b>?
        </p>
      </Modal>

      {/* Remote Management Modal */}
      <RemoteModal
        isOpen={showRemoteModal}
        onClose={() => setShowRemoteModal(false)}
      />
    </aside>
  );
};
