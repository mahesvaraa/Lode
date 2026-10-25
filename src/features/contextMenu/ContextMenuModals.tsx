import React, { useState, useEffect } from "react";
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
  createCommit,
  setRemoteUrl,
} from "@/api/client";
import { BlameModal } from "@/features/history/BlameModal";
import { InteractiveRebaseModal } from "@/features/rebase/InteractiveRebaseModal";
import { Modal, Input, Textarea } from "@/ui";
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

export interface BlameModalState {
  isOpen: boolean;
  filePath: string;
  initialTab?: "blame" | "history";
}

export interface InteractiveRebaseModalState {
  isOpen: boolean;
  baseRef: string;
}

export interface RewordModalState {
  isOpen: boolean;
  commitHash: string;
  currentMessage: string;
}

export interface EditRemoteUrlModalState {
  isOpen: boolean;
  remoteName: string;
  currentUrl: string;
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
  blameModal: BlameModalState;
  setBlameModal: React.Dispatch<React.SetStateAction<BlameModalState>>;
  interactiveRebaseModal: InteractiveRebaseModalState;
  setInteractiveRebaseModal: React.Dispatch<React.SetStateAction<InteractiveRebaseModalState>>;
  rewordModal: RewordModalState;
  setRewordModal: React.Dispatch<React.SetStateAction<RewordModalState>>;
  editRemoteUrlModal: EditRemoteUrlModalState;
  setEditRemoteUrlModal: React.Dispatch<React.SetStateAction<EditRemoteUrlModalState>>;
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
  blameModal,
  setBlameModal,
  interactiveRebaseModal,
  setInteractiveRebaseModal,
  rewordModal,
  setRewordModal,
  editRemoteUrlModal,
  setEditRemoteUrlModal,
}) => {
  const showToast = useToastStore((s) => s.showToast);

  const [rewordText, setRewordText] = useState("");
  const [remoteUrlInput, setRemoteUrlInput] = useState("");

  useEffect(() => {
    if (rewordModal.isOpen) {
      setRewordText(rewordModal.currentMessage);
    }
  }, [rewordModal]);

  useEffect(() => {
    if (editRemoteUrlModal.isOpen) {
      setRemoteUrlInput(editRemoteUrlModal.currentUrl);
    }
  }, [editRemoteUrlModal]);

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

      {/* Blame / File History Modal */}
      <BlameModal
        isOpen={blameModal.isOpen}
        filePath={blameModal.filePath}
        onClose={() => setBlameModal({ isOpen: false, filePath: "" })}
      />

      {/* Interactive Rebase Modal */}
      <InteractiveRebaseModal
        isOpen={interactiveRebaseModal.isOpen}
        baseRef={interactiveRebaseModal.baseRef}
        onClose={() => setInteractiveRebaseModal({ isOpen: false, baseRef: "" })}
      />

      {/* Reword Commit Message Modal */}
      <Modal
        isOpen={rewordModal.isOpen}
        title={`Изменить сообщение коммита (${rewordModal.commitHash.substring(0, 7)})`}
        confirmLabel="Сохранить"
        onClose={() => setRewordModal({ isOpen: false, commitHash: "", currentMessage: "" })}
        onConfirm={async () => {
          if (!currentRepoPath || !rewordText.trim()) return;
          try {
            await createCommit(currentRepoPath, rewordText.trim(), true);
            await refreshAll();
            showToast("Сообщение коммита обновлено");
            setRewordModal({ isOpen: false, commitHash: "", currentMessage: "" });
          } catch (err: unknown) {
            const errObj = err as { message?: string };
            showToast(errObj.message || "Ошибка изменения сообщения", "error");
          }
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--mut)" }}>
            Новое сообщение коммита:
          </label>
          <Textarea
            value={rewordText}
            onChange={(e) => setRewordText(e.target.value)}
            rows={4}
            autoFocus
          />
        </div>
      </Modal>

      {/* Edit Remote URL Modal */}
      <Modal
        isOpen={editRemoteUrlModal.isOpen}
        title={`Изменить URL для remote '${editRemoteUrlModal.remoteName}'`}
        confirmLabel="Сохранить URL"
        onClose={() =>
          setEditRemoteUrlModal({ isOpen: false, remoteName: "", currentUrl: "" })
        }
        onConfirm={async () => {
          if (!currentRepoPath || !remoteUrlInput.trim()) return;
          try {
            await setRemoteUrl(
              currentRepoPath,
              editRemoteUrlModal.remoteName,
              remoteUrlInput.trim()
            );
            await refreshAll();
            showToast(`URL remote '${editRemoteUrlModal.remoteName}' обновлён`);
            setEditRemoteUrlModal({ isOpen: false, remoteName: "", currentUrl: "" });
          } catch (err: unknown) {
            const errObj = err as { message?: string };
            showToast(errObj.message || "Ошибка обновления URL", "error");
          }
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--mut)" }}>URL репозитория:</label>
          <Input
            value={remoteUrlInput}
            onChange={(e) => setRemoteUrlInput(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
};
