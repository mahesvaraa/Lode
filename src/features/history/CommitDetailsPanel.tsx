import React, { useState } from "react";
import { Button, EmptyState, Modal, Skeleton, Splitter } from "@/ui";
import { useHistoryStore } from "@/store/historyStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useRefsStore } from "@/store/refsStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
import { cherryPick, revertCommit, resetRepo } from "@/api/client";
import { BlameModal } from "./BlameModal";
import type { CommitFile } from "@/api/types/commit_file";

export const CommitDetailsPanel: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const selectedHash = useHistoryStore((s) => s.selectedCommitHash);
  const details = useHistoryStore((s) => s.commitDetails);
  const isLoadingDetails = useHistoryStore((s) => s.isLoadingDetails);

  const selectedFile = useHistoryStore((s) => s.selectedCommitFile);
  const selectCommitFile = useHistoryStore((s) => s.selectCommitFile);
  const fileDiff = useHistoryStore((s) => s.commitFileDiff);
  const isLoadingFileDiff = useHistoryStore((s) => s.isLoadingFileDiff);
  const selectCommit = useHistoryStore((s) => s.selectCommit);
  const loadHistory = useHistoryStore((s) => s.loadInitial);

  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const showToast = useToastStore((s) => s.showToast);

  const [panelSplit, setPanelSplit] = useState(280);
  const [blameFilePath, setBlameFilePath] = useState<string | null>(null);

  // Commit operation modals
  const [showCherryPickModal, setShowCherryPickModal] = useState(false);
  const [cherryPickParent, setCherryPickParent] = useState(1);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState<"soft" | "mixed" | "hard">("mixed");
  const [isOperating, setIsOperating] = useState(false);

  const refreshAll = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadStatus(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadRefs(currentRepo.path),
      loadHistory(currentRepo.path),
    ]);
  };

  const handleCherryPick = async (parent?: number) => {
    if (!currentRepo || !details) return;
    setIsOperating(true);
    try {
      await cherryPick(currentRepo.path, details.commit.hash, parent);
      await refreshAll();
      showToast(`Коммит ${details.commit.hash.slice(0, 7)} успешно перенесён (cherry-pick)`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Конфликт при cherry-pick", "error");
      await refreshAll();
      setActiveView("conf");
    } finally {
      setIsOperating(false);
      setShowCherryPickModal(false);
    }
  };

  const handleRevert = async () => {
    if (!currentRepo || !details) return;
    setIsOperating(true);
    try {
      await revertCommit(currentRepo.path, details.commit.hash);
      await refreshAll();
      showToast(`Коммит ${details.commit.hash.slice(0, 7)} отменён (revert)`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Конфликт при revert", "error");
      await refreshAll();
      setActiveView("conf");
    } finally {
      setIsOperating(false);
    }
  };

  const handleReset = async () => {
    if (!currentRepo || !details) return;
    setIsOperating(true);
    try {
      await resetRepo(currentRepo.path, details.commit.hash, resetMode);
      await refreshAll();
      setShowResetModal(false);
      if (resetMode === "hard") {
        showToast(
          "Ветка сброшена (hard reset). Для отмены: git reset --hard ORIG_HEAD",
          "info",
          6000,
          {
            label: "Отменить",
            onClick: async () => {
              try {
                await resetRepo(currentRepo.path, "ORIG_HEAD", "hard");
                await refreshAll();
                showToast("Сброс отменён (ORIG_HEAD)");
              } catch {
                showToast("Не удалось восстановить ORIG_HEAD", "error");
              }
            },
          }
        );
      } else {
        showToast(`Ветка сброшена (${resetMode} reset)`);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка сброса ветки", "error");
    } finally {
      setIsOperating(false);
    }
  };

  if (!selectedHash) {
    return (
      <EmptyState
        title="Коммит не выбран"
        description="Выберите коммит из списка истории слева для просмотра деталей"
      />
    );
  }

  if (isLoadingDetails) {
    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <Skeleton height="24px" width="70%" />
        <Skeleton height="14px" width="40%" />
        <Skeleton height="80px" width="100%" />
        <Skeleton height="120px" width="100%" />
      </div>
    );
  }

  if (!details) {
    return (
      <EmptyState
        title="Нет данных"
        description="Не удалось загрузить подробности о коммите"
      />
    );
  }

  const { commit, files } = details;

  const formatDate = (unixSec: number | bigint) => {
    const sec = typeof unixSec === "bigint" ? Number(unixSec) : unixSec;
    return new Date(sec * 1000).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    if (status.startsWith("A")) return "var(--add)";
    if (status.startsWith("D")) return "var(--del)";
    if (status.startsWith("R")) return "var(--pur)";
    return "var(--acc)";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Top Part: Commit Details & Files List (resizable height) */}
      <div
        style={{
          height: `${panelSplit}px`,
          minHeight: "150px",
          display: "flex",
          flexDirection: "column",
          borderBottom: "1px solid var(--line)",
          backgroundColor: "var(--bg2)",
          overflow: "auto",
        }}
      >
        {/* Commit Header */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              className="mono"
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--mut)",
                backgroundColor: "var(--bg3)",
                padding: "2px 6px",
                borderRadius: "var(--radius-base)",
              }}
            >
              {commit.hash}
            </span>

            {/* Parents Links */}
            {commit.parents.length > 0 && (
              <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "11px", color: "var(--mut)" }}>
                <span>Родители:</span>
                {commit.parents.map((p) => (
                  <span
                    key={p}
                    className="mono"
                    onClick={() => currentRepo && selectCommit(currentRepo.path, p)}
                    style={{
                      cursor: "pointer",
                      color: "var(--acc)",
                      textDecoration: "underline",
                    }}
                    title={`Перейти к коммиту ${p}`}
                  >
                    {p.slice(0, 7)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <h3 style={{ margin: "0 0 6px", fontSize: "var(--font-size-lg)", color: "var(--tx)", lineHeight: 1.3 }}>
            {commit.subject}
          </h3>

          {commit.body && (
            <p
              style={{
                margin: "0 0 8px",
                whiteSpace: "pre-wrap",
                color: "var(--tx)",
                fontSize: "var(--font-size-sm)",
                lineHeight: 1.5,
              }}
            >
              {commit.body}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            <div>
              <b>Автор:</b> {commit.author_name} &lt;{commit.author_email}&gt; ({formatDate(commit.author_date)})
            </div>
            {commit.committer_name !== commit.author_name && (
              <div>
                <b>Коммитер:</b> {commit.committer_name} &lt;{commit.committer_email}&gt; ({formatDate(commit.committer_date)})
              </div>
            )}
          </div>

          {/* Commit Action Buttons */}
          <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
            <Button
              size="sm"
              variant="default"
              disabled={isOperating}
              onClick={() => {
                if (commit.parents.length > 1) {
                  setCherryPickParent(1);
                  setShowCherryPickModal(true);
                } else {
                  handleCherryPick();
                }
              }}
              title="Применить этот коммит к текущей ветке (cherry-pick)"
            >
              Cherry-pick
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isOperating}
              onClick={handleRevert}
              title="Создать новый коммит, отменяющий изменения этого коммита (revert)"
            >
              Revert
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isOperating}
              onClick={() => setShowResetModal(true)}
              title="Сбросить текущую ветку на этот коммит (reset)"
            >
              Reset ветку сюда...
            </Button>
          </div>
        </div>

        {/* Files List in this commit */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "6px 14px",
              backgroundColor: "var(--bg3)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              color: "var(--mut)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            Файлы в коммите ({files.length})
          </div>

          {files.map((file: CommitFile) => {
            const isSelected = selectedFile === file.path;
            const statusChar = file.status.slice(0, 1);

            return (
              <div
                key={file.path}
                onClick={() => currentRepo && selectCommitFile(currentRepo.path, file.path)}
                className={`row ${isSelected ? "on" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "28px",
                  padding: "0 14px",
                  cursor: "pointer",
                  gap: "8px",
                  backgroundColor: isSelected ? "var(--sel)" : "transparent",
                  fontSize: "var(--font-size-sm)",
                  userSelect: "none",
                }}
              >
                <span
                  style={{
                    color: getStatusColor(file.status),
                    fontWeight: 700,
                    width: "14px",
                    textAlign: "center",
                  }}
                >
                  {statusChar}
                </span>

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
                  {file.old_path && (
                    <span style={{ color: "var(--mut)" }}> (было {file.old_path})</span>
                  )}
                </span>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBlameFilePath(file.path);
                  }}
                  style={{ padding: "1px 6px", fontSize: "11px", height: "20px" }}
                  title="Показать построчный blame и историю файла"
                >
                  Blame
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical Splitter */}
      <Splitter
        direction="vertical"
        onResize={(delta) => setPanelSplit((s) => Math.min(Math.max(120, s + delta), 600))}
      />

      {/* Bottom Part: File Diff */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", backgroundColor: "var(--bg)" }}>
        {isLoadingFileDiff ? (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <Skeleton height="18px" width="30%" />
            <Skeleton height="14px" width="90%" />
            <Skeleton height="14px" width="85%" />
          </div>
        ) : !selectedFile ? (
          <EmptyState
            title="Файл не выбран"
            description="Выберите файл из списка выше для просмотра его diff в этом коммите"
          />
        ) : !fileDiff ? (
          <EmptyState title="Нет различий" description="Файл пуст или без изменений" />
        ) : fileDiff.is_binary ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--mut)" }}>
            Бинарный файл не отображается
          </div>
        ) : (
          <div className="diff mono" style={{ width: "100%", minWidth: "max-content", fontSize: "12px", lineHeight: "1.5" }}>
            <div
              style={{
                padding: "6px 14px",
                backgroundColor: "var(--bg2)",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontWeight: 600 }}>{fileDiff.new_path}</span>
              <span style={{ color: "var(--add)", fontWeight: 600 }}>+{fileDiff.total_additions}</span>
              <span style={{ color: "var(--del)", fontWeight: 600 }}>-{fileDiff.total_deletions}</span>
            </div>

            {fileDiff.hunks.map((hunk, hIdx) => (
              <React.Fragment key={hIdx}>
                <div
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "var(--bg2)",
                    color: "var(--mut)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@ {hunk.header}
                </div>

                {hunk.lines.map((line, lIdx) => {
                  const isAdd = line.kind === "Addition";
                  const isDel = line.kind === "Deletion";
                  const bg = isAdd ? "var(--addbg)" : isDel ? "var(--delbg)" : "transparent";
                  const prefix = isAdd ? "+" : isDel ? "-" : " ";

                  return (
                    <div
                      key={lIdx}
                      style={{
                        display: "flex",
                        alignItems: "stretch",
                        backgroundColor: bg,
                        whiteSpace: "pre",
                        minWidth: "max-content",
                      }}
                    >
                      <span
                        style={{
                          width: "36px",
                          textAlign: "right",
                          paddingRight: "8px",
                          color: "var(--mut)",
                          userSelect: "none",
                          borderRight: "1px solid var(--line)",
                        }}
                      >
                        {line.old_no ?? ""}
                      </span>
                      <span
                        style={{
                          width: "36px",
                          textAlign: "right",
                          paddingRight: "8px",
                          color: "var(--mut)",
                          userSelect: "none",
                          borderRight: "1px solid var(--line)",
                        }}
                      >
                        {line.new_no ?? ""}
                      </span>
                      <span
                        style={{
                          width: "18px",
                          textAlign: "center",
                          color: isAdd ? "var(--add)" : isDel ? "var(--del)" : "var(--mut)",
                          fontWeight: 600,
                        }}
                      >
                        {prefix}
                      </span>
                      <span style={{ flex: 1, paddingRight: "12px", color: "var(--tx)" }}>
                        {line.text}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Blame / History Modal */}
      {blameFilePath && (
        <BlameModal
          isOpen={true}
          onClose={() => setBlameFilePath(null)}
          filePath={blameFilePath}
          onSelectCommit={(hash) => {
            if (currentRepo) selectCommit(currentRepo.path, hash);
          }}
        />
      )}

      {/* Cherry-Pick Parent Selection Modal */}
      <Modal
        isOpen={showCherryPickModal}
        onClose={() => setShowCherryPickModal(false)}
        title="Выбор родителя для Cherry-pick"
        confirmLabel="Применить"
        onConfirm={() => handleCherryPick(cherryPickParent)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--tx)", lineHeight: 1.5 }}>
            Этот коммит является слиянием (merge) и имеет несколько родителей. Укажите, относительно какого родителя применить изменения (-m):
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            {details?.commit.parents.map((p, idx) => {
              const num = idx + 1;
              return (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="cherryPickParent"
                    checked={cherryPickParent === num}
                    onChange={() => setCherryPickParent(num)}
                  />
                  <span className="mono" style={{ fontSize: "12px" }}>
                    Родитель {num} ({p.slice(0, 7)})
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title={`Сброс текущей ветки на ${details?.commit.hash.slice(0, 7)}`}
        confirmLabel="Сбросить ветку"
        isDanger={resetMode === "hard"}
        onConfirm={handleReset}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--tx)", lineHeight: 1.5 }}>
            Выберите режим сброса указателя текущей ветки:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="resetMode"
                checked={resetMode === "soft"}
                onChange={() => setResetMode("soft")}
              />
              <div>
                <b style={{ fontSize: "12px" }}>Soft (--soft)</b>
                <div style={{ fontSize: "11px", color: "var(--mut)" }}>
                  Указатель ветки перемещается. Все изменения остаются подготовленными в индексе (staged).
                </div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="resetMode"
                checked={resetMode === "mixed"}
                onChange={() => setResetMode("mixed")}
              />
              <div>
                <b style={{ fontSize: "12px" }}>Mixed (--mixed, по умолчанию)</b>
                <div style={{ fontSize: "11px", color: "var(--mut)" }}>
                  Указатель ветки перемещается, индекс сбрасывается. Все изменения остаются в рабочей копии как незакоммиченные.
                </div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="resetMode"
                checked={resetMode === "hard"}
                onChange={() => setResetMode("hard")}
              />
              <div>
                <b style={{ fontSize: "12px", color: "var(--del)" }}>Hard (--hard, ОПАСНО)</b>
                <div style={{ fontSize: "11px", color: "var(--del)" }}>
                  ВНИМАНИЕ: Все незакоммиченные изменения и коммиты впереди этой точки будут сброшены. Восстановление возможно через команду git reset --hard ORIG_HEAD в reflog.
                </div>
              </div>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};
