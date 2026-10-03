import React, { useState } from "react";
import { Button, Checkbox, Chip, EmptyState, Modal, Splitter, Textarea } from "@/ui";
import { DiffView } from "./DiffView";
import {
  useStatusStore,
  getFileStatusLabel,
  type SelectedFile,
} from "@/store/statusStore";
import { useRepoStore } from "@/store/repoStore";
import type { StatusItem } from "@/api/types/status_item";

export const ChangesView: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const status = useStatusStore((s) => s.status);
  const selectedFile = useStatusStore((s) => s.selectedFile);
  const selectFile = useStatusStore((s) => s.selectFile);

  const stageFile = useStatusStore((s) => s.stageFile);
  const unstageFile = useStatusStore((s) => s.unstageFile);
  const stageAll = useStatusStore((s) => s.stageAll);
  const unstageAll = useStatusStore((s) => s.unstageAll);
  const discardFile = useStatusStore((s) => s.discardFile);
  const commit = useStatusStore((s) => s.commit);

  const isOperating = useStatusStore((s) => s.isOperating);
  const operationError = useStatusStore((s) => s.operationError);
  const clearOperationError = useStatusStore((s) => s.clearOperationError);

  const [panelWidth, setPanelWidth] = useState(320);
  const [commitMsg, setCommitMsg] = useState("");
  const [isAmend, setIsAmend] = useState(false);
  const [fileToDiscard, setFileToDiscard] = useState<StatusItem | null>(null);

  const stagedFiles = status?.staged || [];
  const unstagedFiles = status?.unstaged || [];
  const totalChanges = stagedFiles.length + unstagedFiles.length;

  const handleResize = (delta: number) => {
    setPanelWidth((w) => Math.min(Math.max(220, w + delta), 500));
  };

  const handleSelect = (file: StatusItem, isStaged: boolean) => {
    if (!currentRepo) return;
    const target: SelectedFile = { path: file.path, is_staged: isStaged };
    selectFile(currentRepo.path, target);
  };

  const handleCommit = async () => {
    if (!currentRepo) return;
    if (!isAmend && commitMsg.trim().length === 0) return;

    try {
      await commit(currentRepo.path, commitMsg, isAmend);
      setCommitMsg("");
      setIsAmend(false);
    } catch {
      // operationError is set in store
    }
  };

  const handleConfirmDiscard = () => {
    if (!currentRepo || !fileToDiscard) return;
    const isUntracked = fileToDiscard.status === "Untracked";
    discardFile(currentRepo.path, fileToDiscard.path, isUntracked);
    setFileToDiscard(null);
  };

  const isPartiallyStaged = (path: string) => {
    return (
      stagedFiles.some((f) => f.path === path) &&
      unstagedFiles.some((f) => f.path === path)
    );
  };

  const firstLineLength = commitMsg.split("\n")[0].length;
  const canCommit =
    !isOperating &&
    (isAmend || commitMsg.trim().length > 0) &&
    (isAmend || stagedFiles.length > 0);

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Left panel: File Lists & Commit Box */}
      <div
        style={{
          width: `${panelWidth}px`,
          backgroundColor: "var(--bg2)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        {/* Scrollable File Lists */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {totalChanges === 0 ? (
            <EmptyState
              title="Нет изменений"
              description="Рабочая копия чистая. Внесите правки в файлы — они появятся здесь."
              style={{ padding: "30px 16px" }}
            />
          ) : (
            <>
              {/* Unstaged changes Header */}
              <div
                style={{
                  padding: "8px 10px 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <b style={{ fontSize: "var(--font-size-base)", color: "var(--tx)" }}>
                    Не в индексе
                  </b>
                  <span
                    style={{
                      marginLeft: "6px",
                      color: "var(--mut)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    {unstagedFiles.length}
                  </span>
                </div>

                {unstagedFiles.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isOperating}
                    onClick={() => currentRepo && stageAll(currentRepo.path)}
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                  >
                    Все в индекс
                  </Button>
                )}
              </div>

              {/* Unstaged file rows */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {unstagedFiles.map((file) => {
                  const isSelected =
                    selectedFile?.path === file.path && !selectedFile.is_staged;
                  const partial = isPartiallyStaged(file.path);
                  const statusChar = getFileStatusLabel(file.status);

                  return (
                    <div
                      key={`unstaged-${file.path}`}
                      data-ctx="working-file"
                      data-id={file.path}
                      data-staged="false"
                      data-untracked={file.status === "Untracked" ? "true" : "false"}
                      data-conflicted={file.status === "Conflicted" ? "true" : "false"}
                      onClick={() => handleSelect(file, false)}
                      className={`row ${isSelected ? "on" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "var(--row-height)",
                        padding: "0 8px 0 10px",
                        cursor: "pointer",
                        gap: "8px",
                        backgroundColor: isSelected ? "var(--sel)" : "transparent",
                        fontSize: "var(--font-size-base)",
                        userSelect: "none",
                      }}
                    >
                      <Chip variant="status" statusKind={statusChar as "M" | "A" | "D" | "U"}>
                        {statusChar}
                      </Chip>

                      <span
                        className="mono"
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.path}
                      </span>

                      {partial && <Chip variant="tag">частично</Chip>}

                      {/* Quick action buttons */}
                      <div
                        style={{ display: "flex", gap: "2px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Добавить в индекс"
                          disabled={isOperating}
                          onClick={() => currentRepo && stageFile(currentRepo.path, file.path)}
                          style={{ padding: "2px 6px", fontSize: "11px" }}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Откатить изменения"
                          disabled={isOperating}
                          onClick={() => setFileToDiscard(file)}
                          style={{ padding: "2px 6px", fontSize: "11px" }}
                        >
                          ↺
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Staged changes Header */}
              <div
                style={{
                  padding: "14px 10px 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--line)",
                  marginTop: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <b style={{ fontSize: "var(--font-size-base)", color: "var(--tx)" }}>
                    В индексе
                  </b>
                  <span
                    style={{
                      marginLeft: "6px",
                      color: "var(--mut)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    {stagedFiles.length}
                  </span>
                </div>

                {stagedFiles.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isOperating}
                    onClick={() => currentRepo && unstageAll(currentRepo.path)}
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                  >
                    Все из индекса
                  </Button>
                )}
              </div>

              {/* Staged file rows */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {stagedFiles.map((file) => {
                  const isSelected =
                    selectedFile?.path === file.path && selectedFile.is_staged;
                  const partial = isPartiallyStaged(file.path);
                  const statusChar = getFileStatusLabel(file.status);

                  return (
                    <div
                      key={`staged-${file.path}`}
                      data-ctx="working-file"
                      data-id={file.path}
                      data-staged="true"
                      data-untracked="false"
                      data-conflicted="false"
                      onClick={() => handleSelect(file, true)}
                      className={`row ${isSelected ? "on" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "var(--row-height)",
                        padding: "0 8px 0 10px",
                        cursor: "pointer",
                        gap: "8px",
                        backgroundColor: isSelected ? "var(--sel)" : "transparent",
                        fontSize: "var(--font-size-base)",
                        userSelect: "none",
                      }}
                    >
                      <Chip variant="status" statusKind={statusChar as "M" | "A" | "D" | "U"}>
                        {statusChar}
                      </Chip>

                      <span
                        className="mono"
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.path}
                      </span>

                      {partial && <Chip variant="tag">частично</Chip>}

                      {/* Quick unstage button */}
                      <div
                        style={{ display: "flex", gap: "2px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Исключить из индекса"
                          disabled={isOperating}
                          onClick={() => currentRepo && unstageFile(currentRepo.path, file.path)}
                          style={{ padding: "2px 6px", fontSize: "11px" }}
                        >
                          -
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Operation Error Banner */}
        {operationError && (
          <div
            style={{
              padding: "8px 10px",
              backgroundColor: "var(--delbg)",
              borderTop: "1px solid var(--del)",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ color: "var(--del)" }}>Ошибка Git / Hook</b>
              <Button size="sm" variant="ghost" onClick={clearOperationError} style={{ padding: "0 4px" }}>
                ✕
              </Button>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", maxHeight: "100px", overflow: "auto", fontSize: "11px" }}>
              {operationError}
            </pre>
          </div>
        )}

        {/* Commit Box at bottom of left panel */}
        <div
          style={{
            padding: "10px",
            borderTop: "1px solid var(--line)",
            backgroundColor: "var(--bg2)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <Textarea
            placeholder="Сообщение коммита (Ctrl/Cmd+Enter для отправки)"
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canCommit) {
                e.preventDefault();
                handleCommit();
              }
            }}
            style={{ height: "64px" }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Checkbox
              label="Изменить последний"
              checked={isAmend}
              onChange={(e) => setIsAmend(e.target.checked)}
              style={{ fontSize: "var(--font-size-xs)" }}
            />

            <span
              className="mono"
              style={{
                fontSize: "var(--font-size-xs)",
                color: firstLineLength > 72 ? "var(--del)" : "var(--mut)",
                fontWeight: firstLineLength > 72 ? 600 : 400,
              }}
            >
              {firstLineLength}/72
            </span>
          </div>

          <Button
            variant="primary"
            disabled={!canCommit}
            onClick={handleCommit}
            style={{ width: "100%", marginTop: "2px" }}
          >
            {isAmend ? "Изменить коммит" : "Закоммитить"}
          </Button>
        </div>
      </div>

      {/* Resizable Splitter */}
      <Splitter direction="horizontal" onResize={handleResize} />

      {/* Right panel: Diff View */}
      <div style={{ flex: 1, minWidth: 0, height: "100%", overflow: "hidden" }}>
        <DiffView />
      </div>

      {/* Confirmation modal for file discard */}
      <Modal
        isOpen={fileToDiscard !== null}
        onClose={() => setFileToDiscard(null)}
        title="Подтверждение отката изменений"
        confirmLabel="Откатить изменения"
        isDanger={true}
        onConfirm={handleConfirmDiscard}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы уверены, что хотите безвозвратно откатить изменения в файле <b>{fileToDiscard?.path}</b>?
          Несохранённые данные будут утеряны.
        </p>
      </Modal>
    </div>
  );
};
