import React from "react";
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
  createBranch,
  createTag,
  renameBranch,
  resetBranch,
  cherryPick,
  revertCommit,
} from "@/api/client";
import { useToastStore } from "@/store/toastStore";

export interface BranchModalState {
  isOpen: boolean;
  startPoint: string;
}

export interface TagModalState {
  isOpen: boolean;
  targetHash: string;
}

export interface RenameModalState {
  isOpen: boolean;
  oldName: string;
}

export interface ResetModalState {
  isOpen: boolean;
  hash: string;
  subject?: string;
}

export interface MergeParentModalState {
  isOpen: boolean;
  title: string;
  hash: string;
  parents: string[];
  action: "cherry-pick" | "revert";
}

export interface UpstreamModalState {
  isOpen: boolean;
  branchName: string;
  currentUpstream?: string | null;
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  recoveryHint?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

interface ContextMenuModalsProps {
  currentRepoPath?: string;
  refreshAll: () => Promise<void>;
  availableRemotes: string[];
  branchModal: BranchModalState;
  setBranchModal: React.Dispatch<React.SetStateAction<BranchModalState>>;
  tagModal: TagModalState;
  setTagModal: React.Dispatch<React.SetStateAction<TagModalState>>;
  renameModal: RenameModalState;
  setRenameModal: React.Dispatch<React.SetStateAction<RenameModalState>>;
  resetModal: ResetModalState;
  setResetModal: React.Dispatch<React.SetStateAction<ResetModalState>>;
  mergeParentModal: MergeParentModalState;
  setMergeParentModal: React.Dispatch<React.SetStateAction<MergeParentModalState>>;
  upstreamModal: UpstreamModalState;
  setUpstreamModal: React.Dispatch<React.SetStateAction<UpstreamModalState>>;
  confirmModal: ConfirmModalState;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalState>>;
}

export const ContextMenuModals: React.FC<ContextMenuModalsProps> = ({
  currentRepoPath,
  refreshAll,
  availableRemotes,
  branchModal,
  setBranchModal,
  tagModal,
  setTagModal,
  renameModal,
  setRenameModal,
  resetModal,
  setResetModal,
  mergeParentModal,
  setMergeParentModal,
  upstreamModal,
  setUpstreamModal,
  confirmModal,
  setConfirmModal,
}) => {
  const showToast = useToastStore((s) => s.showToast);

  return (
    <>
      <CreateBranchModal
        isOpen={branchModal.isOpen}
        startPoint={branchModal.startPoint}
        onClose={() => setBranchModal({ isOpen: false, startPoint: "HEAD" })}
        onConfirm={async (name, startPoint, switchTo) => {
          if (!currentRepoPath) return;
          await createBranch(currentRepoPath, name, startPoint, switchTo);
          await refreshAll();
          showToast(`Ветка '${name}' успешно создана`);
        }}
      />

      <CreateTagModal
        isOpen={tagModal.isOpen}
        targetHash={tagModal.targetHash}
        onClose={() => setTagModal({ isOpen: false, targetHash: "HEAD" })}
        onConfirm={async (name, targetHash, message) => {
          if (!currentRepoPath) return;
          await createTag(currentRepoPath, name, targetHash, message);
          await refreshAll();
          showToast(`Тег '${name}' создан`);
        }}
      />

      <RenameBranchModal
        isOpen={renameModal.isOpen}
        oldName={renameModal.oldName}
        onClose={() => setRenameModal({ isOpen: false, oldName: "" })}
        onConfirm={async (oldName, newName) => {
          if (!currentRepoPath) return;
          await renameBranch(currentRepoPath, oldName, newName);
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
          if (!currentRepoPath) return;
          await resetBranch(currentRepoPath, hash, mode);
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
          if (!currentRepoPath) return;
          if (mergeParentModal.action === "cherry-pick") {
            await cherryPick(currentRepoPath, mergeParentModal.hash, parentIndex);
            await refreshAll();
            showToast("Cherry-pick выполнен");
          } else {
            await revertCommit(currentRepoPath, mergeParentModal.hash, parentIndex);
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
