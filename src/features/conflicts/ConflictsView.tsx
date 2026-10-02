import React, { useEffect, useState } from "react";
import { Button, EmptyState, Input, Modal, Textarea } from "@/ui";
import { useStatusStore } from "@/store/statusStore";
import { useRepoStore } from "@/store/repoStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { computeSideLabels, useConflictStore } from "@/store/conflictStore";
import { hasConflictMarkers } from "@/lib/conflictParser";

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "32px",
          textAlign: "center",
          backgroundColor: "var(--bg)",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            backgroundColor: "var(--bg2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ fontSize: "36px" }}>🎉</div>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)", color: "var(--tx)" }}>
            Все конфликты разрешены!
          </h3>
          <p style={{ margin: 0, fontSize: "var(--font-size-base)", color: "var(--mut)", lineHeight: 1.5 }}>
            Все файлы добавлены в индекс. Вы можете завершить операцию ({repoState.message}) или отменить её.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left" }}>
            <label style={{ fontSize: "12px", color: "var(--mut)" }}>
              Сообщение коммита слияния:
            </label>
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
            <Button size="md" variant="ghost" onClick={handleAbort}>
              Отменить слияние
            </Button>
            <Button
              size="md"
              variant="primary"
              disabled={isContinuing}
              onClick={handleContinue}
            >
              {isContinuing ? "Завершение..." : "Продолжить"}
            </Button>
          </div>
        </div>
      </div>
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
      <div
        style={{
          width: "260px",
          borderRight: "1px solid var(--line)",
          backgroundColor: "var(--bg2)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--line)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--mut)",
          }}
        >
          Конфликтные файлы ({conflicts.length})
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {conflicts.map((file) => {
            const isSelected = file.path === selectedFilePath;
            return (
              <div
                key={file.path}
                onClick={() => currentRepo && selectConflictFile(currentRepo.path, file.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "var(--sel)" : "transparent",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <b
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 5px",
                    borderRadius: "4px",
                    backgroundColor: "var(--del)",
                    color: "#fff",
                  }}
                >
                  {file.status === "Conflicted" ? "U" : "M"}
                </b>
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "var(--font-size-base)",
                    color: isSelected ? "var(--tx)" : "var(--mut)",
                    fontWeight: isSelected ? 500 : 400,
                  }}
                  title={file.path}
                >
                  {file.path}
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
              ✕
            </Button>
          </div>
        )}

        {/* Special Handler for DU / UD / Binary or non-marker files */}
        {isNonTextConflict ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                maxWidth: "480px",
                backgroundColor: "var(--bg2)",
                padding: "24px",
                borderRadius: "var(--radius-base)",
                border: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h4 style={{ margin: 0, color: "var(--tx)" }}>
                Конфликт в файле: {selectedFilePath}
              </h4>
              <p style={{ margin: 0, color: "var(--mut)", fontSize: "var(--font-size-sm)", lineHeight: 1.5 }}>
                В файле отсутствуют стандартные текстовые маркеры конфликта (бинарный файл или конфликт удаления/изменения).
                Выберите действие для разрешения конфликта:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
                <Button size="sm" variant="default" onClick={() => handleChoice("ours")}>
                  Взять нашу версию ({sideLabels.leftTitle})
                </Button>
                <Button size="sm" variant="default" onClick={() => handleChoice("theirs")}>
                  Взять их версию ({sideLabels.rightTitle})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleChoice("keep")}>
                  Оставить файл (git add)
                </Button>
                <Button size="sm" variant="primary" onClick={() => handleChoice("delete")}>
                  Удалить файл (git rm)
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Editor Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                borderBottom: "1px solid var(--line)",
                backgroundColor: "var(--bg2)",
                gap: "10px",
              }}
            >
              {/* Navigation */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentBlockIndex === 0}
                  onClick={prevBlock}
                >
                  ◀
                </Button>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--tx)" }}>
                  Блок {activeFile && activeFile.blocks.length > 0 ? currentBlockIndex + 1 : 0} из{" "}
                  {activeFile?.blocks.length || 0}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!activeFile || currentBlockIndex >= activeFile.blocks.length - 1}
                  onClick={nextBlock}
                >
                  ▶
                </Button>
              </div>

              {/* Block Actions */}
              <div style={{ display: "flex", gap: "4px" }}>
                <Button
                  size="sm"
                  variant="default"
                  disabled={!currentBlock}
                  onClick={() => applyBlockChoice("ours")}
                  title={`Принять левую сторону (${sideLabels.leftTitle})`}
                >
                  Взять левое
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  disabled={!currentBlock}
                  onClick={() => applyBlockChoice("theirs")}
                  title={`Принять правую сторону (${sideLabels.rightTitle})`}
                >
                  Взять правое
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!currentBlock}
                  onClick={() => applyBlockChoice("both-ours-theirs")}
                  title="Вставить обе стороны: сначала левое, затем правое"
                >
                  Обе (левое + правое)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!currentBlock}
                  onClick={() => applyBlockChoice("both-theirs-ours")}
                  title="Вставить обе стороны: сначала правое, затем левое"
                >
                  Обе (правое + левое)
                </Button>
              </div>

              {/* Actions Right */}
              <div style={{ display: "flex", gap: "6px" }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRegenerateModal(true)}
                  title="Перегенерировать маркеры со стилем diff3 (включая общий предок base)"
                >
                  Diff3
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={isSaving || hasMarkersLeft}
                  onClick={handleResolveFile}
                  title={
                    hasMarkersLeft
                      ? "Удалите все маркеры перед сохранением"
                      : "Сохранить файл и отметить решённым (git add)"
                  }
                >
                  {isSaving ? "Сохранение..." : "Отметить решённым"}
                </Button>
              </div>
            </div>

            {/* Three-Panel Body: Top (Ours vs Theirs), Bottom (Result Editor) */}
            <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
              {/* Upper split: Left vs Right */}
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  borderBottom: "1px solid var(--line)",
                  overflow: "hidden",
                }}
              >
                {/* Left Side Panel */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: "1px solid var(--line)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "rgba(140, 151, 255, 0.08)",
                      borderBottom: "1px solid var(--line)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--acc)" }}>
                      {sideLabels.leftTitle}
                    </span>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
                      {sideLabels.leftSubtitle}
                    </span>
                  </div>
                  <pre
                    className="mono"
                    style={{
                      flex: 1,
                      margin: 0,
                      padding: "8px",
                      overflow: "auto",
                      fontSize: "12px",
                      backgroundColor: "var(--bg)",
                      color: "var(--tx)",
                      lineHeight: 1.45,
                    }}
                  >
                    {currentBlock?.ours || "(пусто)"}
                  </pre>
                </div>

                {/* Right Side Panel */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "rgba(195, 155, 255, 0.08)",
                      borderBottom: "1px solid var(--line)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--pur)" }}>
                      {sideLabels.rightTitle}
                    </span>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
                      {sideLabels.rightSubtitle}
                    </span>
                  </div>
                  <pre
                    className="mono"
                    style={{
                      flex: 1,
                      margin: 0,
                      padding: "8px",
                      overflow: "auto",
                      fontSize: "12px",
                      backgroundColor: "var(--bg)",
                      color: "var(--tx)",
                      lineHeight: 1.45,
                    }}
                  >
                    {currentBlock?.theirs || "(пусто)"}
                  </pre>
                </div>
              </div>

              {/* Lower Panel: Result Editor */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  backgroundColor: "var(--bg)",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    backgroundColor: "var(--bg2)",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--tx)" }}>
                    Итоговый результат (редактируемый)
                  </span>
                  {hasMarkersLeft && (
                    <span style={{ fontSize: "11px", color: "var(--del)", fontWeight: 500 }}>
                      ⚠️ Содержит неразрешённые маркеры конфликта
                    </span>
                  )}
                </div>

                <Textarea
                  value={resolvedContent}
                  onChange={(e) => updateResolvedContent(e.target.value)}
                  className="mono"
                  style={{
                    flex: 1,
                    width: "100%",
                    height: "100%",
                    resize: "none",
                    border: "none",
                    borderRadius: 0,
                    padding: "8px 10px",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    backgroundColor: "var(--bg)",
                    color: "var(--tx)",
                    outline: "none",
                  }}
                  placeholder="Итоговый файл..."
                />
              </div>
            </div>
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
