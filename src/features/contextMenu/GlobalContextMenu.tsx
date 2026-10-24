import React, { useEffect, useState, useMemo } from "react";
import { ContextMenu } from "@/ui";
import { useContextMenuStore } from "@/store/contextMenuStore";
import { useRepoStore } from "@/store/repoStore";
import { useRefsStore } from "@/store/refsStore";
import {
  ContextMenuModals,
  type BranchModalState,
  type TagModalState,
  type RenameModalState,
  type ResetModalState,
  type MergeParentModalState,
  type UpstreamModalState,
  type ConfirmModalState,
} from "./ContextMenuModals";
import { useContextMenuDispatcher } from "./useContextMenuDispatcher";

export const GlobalContextMenu: React.FC = () => {
  const { isOpen, x, y, items, closeMenu } = useContextMenuStore();
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const refs = useRefsStore((s) => s.refs);

  // Dialog states
  const [branchModal, setBranchModal] = useState<BranchModalState>({
    isOpen: false,
    startPoint: "HEAD",
  });
  const [tagModal, setTagModal] = useState<TagModalState>({
    isOpen: false,
    targetHash: "HEAD",
  });
  const [renameModal, setRenameModal] = useState<RenameModalState>({
    isOpen: false,
    oldName: "",
  });
  const [resetModal, setResetModal] = useState<ResetModalState>({
    isOpen: false,
    hash: "",
  });
  const [mergeParentModal, setMergeParentModal] = useState<MergeParentModalState>({
    isOpen: false,
    title: "",
    hash: "",
    parents: [],
    action: "cherry-pick",
  });
  const [upstreamModal, setUpstreamModal] = useState<UpstreamModalState>({
    isOpen: false,
    branchName: "",
  });
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: async () => {},
  });

  const dialogSetters = useMemo(
    () => ({
      setBranchModal,
      setTagModal,
      setRenameModal,
      setResetModal,
      setMergeParentModal,
      setUpstreamModal,
      setConfirmModal,
    }),
    []
  );

  const { handleContextMenu, refreshAll } = useContextMenuDispatcher(dialogSetters);

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

      <ContextMenuModals
        currentRepoPath={currentRepo?.path}
        refreshAll={refreshAll}
        availableRemotes={availableRemotes}
        branchModal={branchModal}
        setBranchModal={setBranchModal}
        tagModal={tagModal}
        setTagModal={setTagModal}
        renameModal={renameModal}
        setRenameModal={setRenameModal}
        resetModal={resetModal}
        setResetModal={setResetModal}
        mergeParentModal={mergeParentModal}
        setMergeParentModal={setMergeParentModal}
        upstreamModal={upstreamModal}
        setUpstreamModal={setUpstreamModal}
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
      />
    </>
  );
};
