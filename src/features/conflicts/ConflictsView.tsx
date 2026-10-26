import React, { useEffect, useState } from "react";
import { Button, EmptyState, Modal, CloseIcon } from "@/ui";
import { useStatusStore } from "@/store/statusStore";
import { useRepoStore } from "@/store/repoStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { computeSideLabels, useConflictStore } from "@/store/conflictStore";
import { hasConflictMarkers } from "@/lib/conflictParser";
import { ConflictCompletedState } from "./ConflictCompletedState";
import { ConflictFileList } from "./ConflictFileList";
import { NonTextConflictView } from "./NonTextConflictView";
import { ConflictEditorToolbar } from "./ConflictEditorToolbar";
import { ThreeWayConflictPane } from "./ThreeWayConflictPane";

export const ConflictsView: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const status = useStatusStore((s) => s.status);
  const loadStatus = useStatusStore((s) => s.loadStatus);
  const repoState = useRefsStore((s) => s.repoState);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadHistory = useHistoryStore((s) => s.loadInitial);

  const selectedFilePath = useConflictStore((s) => s.selectedFilePath);
  const activeFile = useConflictStore((s) => s.activeFile);
  const resolvedContent = useConflictStore((s) => s.resolvedContent);
  const currentBlockIndex = useConflictStore((s) => s.currentBlockIndex);
  const isSaving = useConflictStore((s) => s.isSaving);
  const isContinuing = useConflictStore((s) => s.isContinuing);
  const error = useConflictStore((s) => s.error);

  const selectConflictFile = useConflictStore((s) => s.selectConflictFile);
  const updateResolvedContent = useConflictStore((s) => s.updateResolvedContent);
  const applyBlockChoice = useConflictStore((s) => s.applyBlockChoice);
  const regenerateDiff3 = useConflictStore((s) => s.regenerateDiff3);
  const resolveCurrentFile = useConflictStore((s) => s.resolveCurrentFile);
  const resolveByChoice = useConflictStore((s) => s.resolveByChoice);
  const continueCurrentOperation = useConflictStore((s) => s.continueCurrentOperation);
  const nextBlock = useConflictStore((s) => s.nextBlock);
  const prevBlock = useConflictStore((s) => s.prevBlock);
  const clearError = useConflictStore((s) => s.clearError);
  const abortMerge = useRefsStore((s) => s.abortMerge);

  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Merge branch into working tree");

  const conflicts = status?.conflicts || [];

  const currentBranch = currentRepo?.current_branch || status?.branch.head || "main";
  const sideLabels = computeSideLabels(repoState, currentBranch);

  useEffect(() => {
    if (conflicts.length > 0 && !selectedFilePath && currentRepo) {
      selectConflictFile(currentRepo.path, conflicts[0].path);
    }
  }, [conflicts, selectedFilePath, currentRepo, selectConflictFile]);

  const refreshAll = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadStatus(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadRefs(currentRepo.path),
      loadHistory(currentRepo.path),
    ]);
  };

  const handleResolveFile = async () => {
    if (!currentRepo) return;
    try {
      await resolveCurrentFile(currentRepo.path);
      await refreshAll();
    } catch {
      // error handled in store
    }
  };

  const handleChoice = async (choice: "ours" | "theirs" | "delete" | "keep") => {
    if (!currentRepo || !selectedFilePath) return;
    try {
      await resolveByChoice(currentRepo.path, selectedFilePath, choice);
      await refreshAll();
    } catch {
      // error handled in store
    }
  };

  const handleContinue = async () => {
    if (!currentRepo) return;
    try {
      await continueCurrentOperation(currentRepo.path, commitMessage);
      await refreshAll();
    } catch {
      // error handled in store
    }
  };

  const handleAbort = async () => {
    if (!currentRepo) return;
    try {
      await abortMerge(currentRepo.path);
      await refreshAll();
    } catch {
      // error handled in store
    }
  };

  // State 1: All conflicts resolved, but operation still in progress
  if (conflicts.length === 0 && repoState && repoState.kind !== "Normal") {
    return (
      <ConflictCompletedState
        repoState={repoState}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        isContinuing={isContinuing}
        onAbort={handleAbort}
        onContinue={handleContinue}
      />
    );
  }

  // State 2: No conflicts and normal repo state
  if (conflicts.length === 0) {
    return (
      <EmptyState
        title="Конфликтов нет"
        description="Репозиторий находится в нормальном состоянии. При слиянии или перебазировании с конфликтами файлы появятся здесь."
      />
    );
  }

  const currentBlock = activeFile?.blocks[currentBlockIndex];
  const hasMarkersLeft = hasConflictMarkers(resolvedContent);
  const isNonTextConflict = activeFile !== null && !activeFile.has_markers;

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Left List of Conflicted Files */}
      <ConflictFileList
        conflicts={conflicts}
        selectedFilePath={selectedFilePath}
        onSelectFile={(path) => currentRepo && selectConflictFile(currentRepo.path, path)}
      />

      {/* Main Resolution Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {error && (
          <div
            style={{
              padding: "8px 16px",
              backgroundColor: "rgba(255, 107, 102, 0.15)",
              color: "var(--del)",
              fontSize: "var(--font-size-sm)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={clearError}>
              <CloseIcon size={12} />
            </Button>
          </div>
        )}

        {/* Special Handler for DU / UD / Binary or non-marker files */}
        {isNonTextConflict ? (
          <NonTextConflictView
            filePath={selectedFilePath || ""}
            sideLabels={sideLabels}
            onChoice={handleChoice}
          />
        ) : (
          <>
            {/* Editor Toolbar */}
            <ConflictEditorToolbar
              currentBlockIndex={currentBlockIndex}
              totalBlocks={activeFile?.blocks.length || 0}
              currentBlock={currentBlock}
              sideLabels={sideLabels}
              isSaving={isSaving}
              hasMarkersLeft={hasMarkersLeft}
              onPrevBlock={prevBlock}
              onNextBlock={nextBlock}
              onApplyBlockChoice={applyBlockChoice}
              onOpenRegenerateModal={() => setShowRegenerateModal(true)}
              onResolveFile={handleResolveFile}
            />

            {/* Three-Panel Body: Top (Ours vs Theirs), Bottom (Result Editor) */}
            <ThreeWayConflictPane
              currentBlock={currentBlock}
              sideLabels={sideLabels}
              resolvedContent={resolvedContent}
              hasMarkersLeft={hasMarkersLeft}
              onUpdateResolvedContent={updateResolvedContent}
            />
          </>
        )}
      </div>

      {/* Regenerate Diff3 Modal */}
      <Modal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        title="Перегенерировать маркеры в стиле diff3?"
        confirmLabel="Перегенерировать"
        isDanger={true}
        onConfirm={() => {
          if (currentRepo) {
            regenerateDiff3(currentRepo.path);
          }
          setShowRegenerateModal(false);
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Перегенерация конфликта со стилем <b>diff3</b> заново создаст маркеры с показом общего предка (base).
          Внимание: любые несохранённые ручные правки в этом файле будут сброшены.
        </p>
      </Modal>
    </div>
  );
};
