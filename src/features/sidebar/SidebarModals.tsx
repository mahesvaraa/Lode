import React from "react";
import { Checkbox, Input, Modal } from "@/ui";
import { CreateWorktreeModal } from "@/features/dialogs";
import { RemoteModal } from "@/features/remote/RemoteModal";
import { StashModal } from "@/features/stash/StashModal";
import type { GitRef } from "@/api/types/git_ref";
import type { WorktreeInfo } from "@/api/types/worktree_info";

interface SidebarModalsProps {
  currentBranchName: string;
  localBranches: GitRef[];

  // Branch modals
  showCreateBranch: boolean;
  onCloseCreateBranch: () => void;
  newBranchName: string;
  setNewBranchName: (name: string) => void;
  switchToNewBranch: boolean;
  setSwitchToNewBranch: (val: boolean) => void;
  onConfirmCreateBranch: () => Promise<void>;

  branchToRename: GitRef | null;
  onCloseRenameBranch: () => void;
  renamedBranchName: string;
  setRenamedBranchName: (name: string) => void;
  onConfirmRenameBranch: () => Promise<void>;

  branchToDelete: GitRef | null;
  onCloseDeleteBranch: () => void;
  forceDeleteBranch: boolean;
  setForceDeleteBranch: (val: boolean) => void;
  onConfirmDeleteBranch: () => Promise<void>;

  branchToMerge: GitRef | null;
  onCloseMergeBranch: () => void;
  onConfirmMergeBranch: () => Promise<void>;

  // Tag modals
  showCreateTag: boolean;
  onCloseCreateTag: () => void;
  newTagName: string;
  setNewTagName: (name: string) => void;
  newTagMessage: string;
  setNewTagMessage: (msg: string) => void;
  onConfirmCreateTag: () => Promise<void>;

  tagToDelete: GitRef | null;
  onCloseDeleteTag: () => void;
  onConfirmDeleteTag: () => Promise<void>;

  // Worktree modals
  showCreateWorktree: boolean;
  onCloseCreateWorktree: () => void;
  onConfirmCreateWorktree: (path: string, branch?: string, newBranch?: string) => Promise<void>;

  worktreeToDelete: WorktreeInfo | null;
  onCloseDeleteWorktree: () => void;
  forceDeleteWorktree: boolean;
  setForceDeleteWorktree: (val: boolean) => void;
  onConfirmDeleteWorktree: () => Promise<void>;

  // Remote & Stash modals
  showRemoteModal: boolean;
  onCloseRemoteModal: () => void;
  showStashModal: boolean;
  onCloseStashModal: () => void;
}

export const SidebarModals: React.FC<SidebarModalsProps> = ({
  currentBranchName,
  localBranches,

  showCreateBranch,
  onCloseCreateBranch,
  newBranchName,
  setNewBranchName,
  switchToNewBranch,
  setSwitchToNewBranch,
  onConfirmCreateBranch,

  branchToRename,
  onCloseRenameBranch,
  renamedBranchName,
  setRenamedBranchName,
  onConfirmRenameBranch,

  branchToDelete,
  onCloseDeleteBranch,
  forceDeleteBranch,
  setForceDeleteBranch,
  onConfirmDeleteBranch,

  branchToMerge,
  onCloseMergeBranch,
  onConfirmMergeBranch,

  showCreateTag,
  onCloseCreateTag,
  newTagName,
  setNewTagName,
  newTagMessage,
  setNewTagMessage,
  onConfirmCreateTag,

  tagToDelete,
  onCloseDeleteTag,
  onConfirmDeleteTag,

  showCreateWorktree,
  onCloseCreateWorktree,
  onConfirmCreateWorktree,

  worktreeToDelete,
  onCloseDeleteWorktree,
  forceDeleteWorktree,
  setForceDeleteWorktree,
  onConfirmDeleteWorktree,

  showRemoteModal,
  onCloseRemoteModal,
  showStashModal,
  onCloseStashModal,
}) => {
  return (
    <>
      {/* Create Branch Modal */}
      <Modal
        isOpen={showCreateBranch}
        onClose={onCloseCreateBranch}
        title="Создать ветку"
        confirmLabel="Создать"
        onConfirm={onConfirmCreateBranch}
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
        onClose={onCloseRenameBranch}
        title={`Переименовать ветку ${branchToRename?.name}`}
        confirmLabel="Переименовать"
        onConfirm={onConfirmRenameBranch}
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
        onClose={onCloseDeleteBranch}
        title={`Удалить ветку ${branchToDelete?.name}?`}
        confirmLabel="Удалить ветку"
        isDanger={true}
        onConfirm={onConfirmDeleteBranch}
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
        onClose={onCloseMergeBranch}
        title="Слияние веток"
        confirmLabel={`Влить ${branchToMerge?.name} в ${currentBranchName}`}
        onConfirm={onConfirmMergeBranch}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы собираетесь влить изменения из ветки <b>{branchToMerge?.name}</b> в текущую ветку <b>{currentBranchName}</b>.
        </p>
      </Modal>

      {/* Create Tag Modal */}
      <Modal
        isOpen={showCreateTag}
        onClose={onCloseCreateTag}
        title="Создать тег"
        confirmLabel="Создать"
        onConfirm={onConfirmCreateTag}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginBottom: "4px" }}>
              Имя тега (например, v1.0.0)
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
              Сообщение тега (опционально)
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
        onClose={onCloseDeleteTag}
        title={`Удалить тег ${tagToDelete?.name}?`}
        confirmLabel="Удалить тег"
        isDanger={true}
        onConfirm={onConfirmDeleteTag}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы уверены, что хотите удалить тег <b>{tagToDelete?.name}</b>?
        </p>
      </Modal>

      {/* Create Worktree Modal */}
      <CreateWorktreeModal
        isOpen={showCreateWorktree}
        branches={localBranches}
        onClose={onCloseCreateWorktree}
        onConfirm={onConfirmCreateWorktree}
      />

      {/* Delete Worktree Modal */}
      <Modal
        isOpen={worktreeToDelete !== null}
        onClose={onCloseDeleteWorktree}
        title="Удалить рабочее дерево?"
        confirmLabel="Удалить worktree"
        isDanger={true}
        onConfirm={onConfirmDeleteWorktree}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Вы уверены, что хотите удалить рабочее дерево по пути{" "}
            <b>{worktreeToDelete?.path}</b>?
          </p>
          <Checkbox
            label="Принудительное удаление (--force)"
            checked={forceDeleteWorktree}
            onChange={(e) => setForceDeleteWorktree(e.target.checked)}
          />
        </div>
      </Modal>

      {/* Remote Management Modal */}
      <RemoteModal isOpen={showRemoteModal} onClose={onCloseRemoteModal} />

      {/* Stash Management Modal */}
      <StashModal isOpen={showStashModal} onClose={onCloseStashModal} />
    </>
  );
};
