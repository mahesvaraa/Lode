import React, { useState } from "react";
import { Button, EmptyState, Modal, Skeleton } from "@/ui";
import { useStatusStore } from "@/store/statusStore";
import { useRepoStore } from "@/store/repoStore";
import type { DiffLine } from "@/api/types/diff_line";
import type { DiffHunk } from "@/api/types/diff_hunk";

export const DiffView: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const selectedFile = useStatusStore((s) => s.selectedFile);
  const diff = useStatusStore((s) => s.diff);
  const isLoading = useStatusStore((s) => s.isLoadingDiff);
  const diffError = useStatusStore((s) => s.diffError);
  const diffMode = useStatusStore((s) => s.diffMode);
  const setDiffMode = useStatusStore((s) => s.setDiffMode);
  const showFullDiff = useStatusStore((s) => s.showFullDiff);
  const setShowFullDiff = useStatusStore((s) => s.setShowFullDiff);

  const stageFile = useStatusStore((s) => s.stageFile);
  const unstageFile = useStatusStore((s) => s.unstageFile);
  const discardFile = useStatusStore((s) => s.discardFile);

  const [confirmDiscardFile, setConfirmDiscardFile] = useState(false);

  if (!selectedFile) {
    return (
      <EmptyState
        title="Файл не выбран"
        description="Выберите файл из списка изменений слева, чтобы просмотреть различия"
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <Skeleton height="24px" width="40%" />
        <Skeleton height="14px" width="100%" />
        <Skeleton height="14px" width="95%" />
        <Skeleton height="14px" width="98%" />
        <Skeleton height="14px" width="80%" />
      </div>
    );
  }

  if (diffError) {
    return (
      <EmptyState
        title="Ошибка чтения diff"
        description={diffError}
      />
    );
  }

  if (!diff) {
    return (
      <EmptyState
        title="Нет различий"
        description="Файл идентичен текущему индексу или ветке"
      />
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileStageToggle = () => {
    if (!currentRepo || !selectedFile) return;
    if (selectedFile.is_staged) {
      unstageFile(currentRepo.path, selectedFile.path);
    } else {
      stageFile(currentRepo.path, selectedFile.path);
    }
  };

  const handleConfirmDiscard = () => {
    if (!currentRepo || !selectedFile) return;
    const isUntracked = diff.status === "Untracked";
    discardFile(currentRepo.path, selectedFile.path, isUntracked);
    setConfirmDiscardFile(false);
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
      {/* Diff Top Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "6px 14px",
          borderBottom: "1px solid var(--line)",
          backgroundColor: "var(--bg2)",
          flexShrink: 0,
        }}
      >
        <span
          className="mono"
          style={{
            fontWeight: 600,
            fontSize: "var(--font-size-base)",
            color: "var(--tx)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {diff.new_path}
          {diff.old_path && diff.old_path !== diff.new_path && (
            <span style={{ color: "var(--mut)", fontWeight: 400 }}> (было {diff.old_path})</span>
          )}
        </span>

        {/* Stats */}
        {!diff.is_binary && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "12px" }}>
            <span style={{ color: "var(--add)", fontWeight: 600 }}>+{diff.total_additions}</span>
            <span style={{ color: "var(--del)", fontWeight: 600 }}>-{diff.total_deletions}</span>
          </div>
        )}

        {/* File actions */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {selectedFile.is_staged ? (
            <Button size="sm" onClick={handleFileStageToggle}>
              Из индекса
            </Button>
          ) : (
            <>
              <Button size="sm" variant="primary" onClick={handleFileStageToggle}>
                В индекс
              </Button>
              <Button size="sm" onClick={() => setConfirmDiscardFile(true)}>
                Откатить
              </Button>
            </>
          )}
        </div>

        {/* Diff Mode Toggle */}
        <div style={{ display: "flex", gap: "2px", backgroundColor: "var(--bg3)", padding: "2px", borderRadius: "var(--radius-base)" }}>
          <Button
            size="sm"
            variant={diffMode === "inline" ? "primary" : "ghost"}
            onClick={() => setDiffMode("inline")}
            style={{ padding: "2px 8px", fontSize: "11px" }}
          >
            Inline
          </Button>
          <Button
            size="sm"
            variant={diffMode === "side-by-side" ? "primary" : "ghost"}
            onClick={() => setDiffMode("side-by-side")}
            style={{ padding: "2px 8px", fontSize: "11px" }}
          >
            Side-by-side
          </Button>
        </div>
      </div>

      {/* Truncation Warning Banner */}
      {diff.is_truncated && !showFullDiff && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 14px",
            backgroundColor: "var(--delbg)",
            borderBottom: "1px solid var(--line)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <span>
            Diff очень большой (более 5 000 строк или 1 МБ). Показана первая часть для сохранения быстродействия.
          </span>
          <div style={{ marginLeft: "auto" }}>
            <Button size="sm" onClick={() => setShowFullDiff(true)}>
              Показать всё
            </Button>
          </div>
        </div>
      )}

      {/* Main Diff Content */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {diff.is_binary ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "32px", color: "var(--mut)" }}>💾</div>
            <h4 style={{ margin: 0 }}>Бинарный файл</h4>
            <p style={{ margin: 0, color: "var(--mut)", fontSize: "var(--font-size-sm)" }}>
              Размер: {formatFileSize(diff.raw_size_bytes)}. Различия в бинарных файлах не отображаются в текстовом редакторе.
            </p>
          </div>
        ) : diffMode === "inline" ? (
          <InlineDiffView hunks={diff.hunks} filePath={diff.new_path} isStaged={selectedFile.is_staged} />
        ) : (
          <SideBySideDiffView hunks={diff.hunks} filePath={diff.new_path} isStaged={selectedFile.is_staged} />
        )}
      </div>

      {/* Discard confirmation modal */}
      <Modal
        isOpen={confirmDiscardFile}
        onClose={() => setConfirmDiscardFile(false)}
        title="Подтверждение отката изменений"
        confirmLabel="Откатить изменения"
        isDanger={true}
        onConfirm={handleConfirmDiscard}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы уверены, что хотите безвозвратно откатить изменения в файле <b>{selectedFile.path}</b>?
          Несохранённые данные будут утеряны.
        </p>
      </Modal>
    </div>
  );
};

interface HunkProps {
  hunks: DiffHunk[];
  filePath: string;
  isStaged: boolean;
}

const InlineDiffView: React.FC<HunkProps> = ({ hunks, filePath, isStaged }) => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const stageHunk = useStatusStore((s) => s.stageHunk);
  const unstageHunk = useStatusStore((s) => s.unstageHunk);
  const stageLines = useStatusStore((s) => s.stageLines);
  const unstageLines = useStatusStore((s) => s.unstageLines);
  const discardLines = useStatusStore((s) => s.discardLines);

  const [selectedLinesMap, setSelectedLinesMap] = useState<Record<number, number[]>>({});
  const [confirmDiscardHunkIdx, setConfirmDiscardHunkIdx] = useState<number | null>(null);

  if (hunks.length === 0) {
    return <div style={{ padding: "24px", color: "var(--mut)", textAlign: "center" }}>Файл пуст или без изменений</div>;
  }

  const toggleLineSelect = (hunkIdx: number, lineIdx: number) => {
    setSelectedLinesMap((prev) => {
      const current = prev[hunkIdx] || [];
      const next = current.includes(lineIdx)
        ? current.filter((i) => i !== lineIdx)
        : [...current, lineIdx].sort((a, b) => a - b);
      return { ...prev, [hunkIdx]: next };
    });
  };

  const handleStageSelectedLines = (hunkIdx: number) => {
    if (!currentRepo) return;
    const lines = selectedLinesMap[hunkIdx] || [];
    if (lines.length === 0) return;
    if (isStaged) {
      unstageLines(currentRepo.path, filePath, hunkIdx, lines);
    } else {
      stageLines(currentRepo.path, filePath, hunkIdx, lines);
    }
    setSelectedLinesMap((prev) => ({ ...prev, [hunkIdx]: [] }));
  };

  const handleDiscardSelectedLines = (hunkIdx: number) => {
    if (!currentRepo) return;
    const lines = selectedLinesMap[hunkIdx] || [];
    if (lines.length === 0) return;
    discardLines(currentRepo.path, filePath, hunkIdx, lines);
    setSelectedLinesMap((prev) => ({ ...prev, [hunkIdx]: [] }));
  };

  return (
    <div className="diff mono" style={{ width: "100%", minWidth: "max-content", fontSize: "12px", lineHeight: "1.5" }}>
      {hunks.map((hunk, hIdx) => {
        const selectedForHunk = selectedLinesMap[hIdx] || [];
        const hasSelection = selectedForHunk.length > 0;

        return (
          <React.Fragment key={hIdx}>
            {/* Hunk Header & Action Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                backgroundColor: "var(--bg2)",
                color: "var(--mut)",
                borderBottom: "1px solid var(--line)",
                userSelect: "none",
              }}
            >
              <span style={{ fontWeight: 500 }}>
                @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
              </span>
              {hunk.header && <span style={{ flex: 1 }}>{hunk.header}</span>}

              {/* Hunk / Selected Lines Actions */}
              <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                {hasSelection ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleStageSelectedLines(hIdx)}
                      style={{ padding: "2px 8px", fontSize: "11px" }}
                    >
                      {isStaged
                        ? `Исключить строки (${selectedForHunk.length})`
                        : `В индекс (${selectedForHunk.length})`}
                    </Button>
                    {!isStaged && (
                      <Button
                        size="sm"
                        onClick={() => handleDiscardSelectedLines(hIdx)}
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                      >
                        Откатить ({selectedForHunk.length})
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {isStaged ? (
                      <Button
                        size="sm"
                        onClick={() => currentRepo && unstageHunk(currentRepo.path, filePath, hIdx)}
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                      >
                        Исключить фрагмент
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => currentRepo && stageHunk(currentRepo.path, filePath, hIdx)}
                          style={{ padding: "2px 8px", fontSize: "11px" }}
                        >
                          Фрагмент в индекс
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setConfirmDiscardHunkIdx(hIdx)}
                          style={{ padding: "2px 8px", fontSize: "11px" }}
                        >
                          Откатить фрагмент
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Hunk Lines */}
            {hunk.lines.map((line, lIdx) => {
              const isAdd = line.kind === "Addition";
              const isDel = line.kind === "Deletion";
              const isChangeable = isAdd || isDel;
              const isSelected = selectedForHunk.includes(lIdx);

              const bg = isSelected
                ? "var(--sel)"
                : isAdd
                ? "var(--addbg)"
                : isDel
                ? "var(--delbg)"
                : "transparent";
              const prefix = isAdd ? "+" : isDel ? "-" : " ";

              return (
                <div
                  key={lIdx}
                  onClick={() => isChangeable && toggleLineSelect(hIdx, lIdx)}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    backgroundColor: bg,
                    whiteSpace: "pre",
                    minWidth: "max-content",
                    cursor: isChangeable ? "pointer" : "default",
                  }}
                  title={isChangeable ? "Нажмите для выбора строки" : undefined}
                >
                  {/* Selection indicator */}
                  <span
                    style={{
                      width: "20px",
                      textAlign: "center",
                      color: isSelected ? "var(--acc)" : "transparent",
                      userSelect: "none",
                      fontSize: "10px",
                      lineHeight: "20px",
                    }}
                  >
                    {isChangeable ? (isSelected ? "✔" : "·") : ""}
                  </span>

                  {/* Old line number */}
                  <span
                    style={{
                      width: "36px",
                      textAlign: "right",
                      paddingRight: "8px",
                      color: "var(--mut)",
                      userSelect: "none",
                      flexShrink: 0,
                      borderRight: "1px solid var(--line)",
                    }}
                  >
                    {line.old_no ?? ""}
                  </span>

                  {/* New line number */}
                  <span
                    style={{
                      width: "36px",
                      textAlign: "right",
                      paddingRight: "8px",
                      color: "var(--mut)",
                      userSelect: "none",
                      flexShrink: 0,
                      borderRight: "1px solid var(--line)",
                    }}
                  >
                    {line.new_no ?? ""}
                  </span>

                  {/* Prefix */}
                  <span
                    style={{
                      width: "18px",
                      textAlign: "center",
                      userSelect: "none",
                      color: isAdd ? "var(--add)" : isDel ? "var(--del)" : "var(--mut)",
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {prefix}
                  </span>

                  {/* Text Content */}
                  <span style={{ flex: 1, paddingRight: "12px", color: "var(--tx)" }}>
                    {line.text}
                  </span>

                  {/* CRLF indicator */}
                  {line.has_crlf && (
                    <span
                      title="Строка с окончанием CRLF (\r\n)"
                      style={{
                        fontSize: "9px",
                        color: "var(--mut)",
                        opacity: 0.7,
                        padding: "0 4px",
                        userSelect: "none",
                      }}
                    >
                      CRLF
                    </span>
                  )}

                  {/* No newline indicator */}
                  {line.no_eol && (
                    <span
                      title="Нет финального перевода строки"
                      style={{
                        fontSize: "10px",
                        color: "var(--del)",
                        padding: "0 6px",
                        fontWeight: 600,
                        userSelect: "none",
                      }}
                    >
                      \ No newline
                    </span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Discard hunk modal */}
      <Modal
        isOpen={confirmDiscardHunkIdx !== null}
        onClose={() => setConfirmDiscardHunkIdx(null)}
        title="Откатить фрагмент"
        confirmLabel="Откатить фрагмент"
        isDanger={true}
        onConfirm={() => {
          if (confirmDiscardHunkIdx !== null && currentRepo) {
            const allIndices = Array.from(
              { length: hunks[confirmDiscardHunkIdx].lines.length },
              (_, i) => i
            );
            discardLines(currentRepo.path, filePath, confirmDiscardHunkIdx, allIndices);
            setConfirmDiscardHunkIdx(null);
          }
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы уверены, что хотите безвозвратно откатить этот фрагмент изменений в файле <b>{filePath}</b>?
        </p>
      </Modal>
    </div>
  );
};

const SideBySideDiffView: React.FC<HunkProps> = ({ hunks, filePath, isStaged }) => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const stageHunk = useStatusStore((s) => s.stageHunk);
  const unstageHunk = useStatusStore((s) => s.unstageHunk);

  if (hunks.length === 0) {
    return <div style={{ padding: "24px", color: "var(--mut)", textAlign: "center" }}>Файл пуст или без изменений</div>;
  }

  return (
    <div className="diff-side-by-side mono" style={{ width: "100%", minWidth: "max-content", fontSize: "12px", lineHeight: "1.5" }}>
      {hunks.map((hunk, hIdx) => {
        const pairs: { left: DiffLine | null; right: DiffLine | null }[] = [];
        let i = 0;

        while (i < hunk.lines.length) {
          const line = hunk.lines[i];

          if (line.kind === "Context") {
            pairs.push({ left: line, right: line });
            i++;
          } else if (line.kind === "Deletion") {
            if (i + 1 < hunk.lines.length && hunk.lines[i + 1].kind === "Addition") {
              pairs.push({ left: line, right: hunk.lines[i + 1] });
              i += 2;
            } else {
              pairs.push({ left: line, right: null });
              i++;
            }
          } else if (line.kind === "Addition") {
            pairs.push({ left: null, right: line });
            i++;
          }
        }

        return (
          <React.Fragment key={hIdx}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "4px 10px",
                backgroundColor: "var(--bg2)",
                color: "var(--mut)",
                borderBottom: "1px solid var(--line)",
                userSelect: "none",
              }}
            >
              <span style={{ fontWeight: 500 }}>
                @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
              </span>
              {hunk.header && <span style={{ flex: 1 }}>{hunk.header}</span>}

              <div style={{ marginLeft: "auto" }}>
                {isStaged ? (
                  <Button
                    size="sm"
                    onClick={() => currentRepo && unstageHunk(currentRepo.path, filePath, hIdx)}
                    style={{ padding: "2px 8px", fontSize: "11px" }}
                  >
                    Исключить фрагмент
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => currentRepo && stageHunk(currentRepo.path, filePath, hIdx)}
                    style={{ padding: "2px 8px", fontSize: "11px" }}
                  >
                    Фрагмент в индекс
                  </Button>
                )}
              </div>
            </div>

            {pairs.map((pair, pIdx) => (
              <div
                key={pIdx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  minWidth: "max-content",
                  borderBottom: "1px solid rgba(255,255,255,0.02)",
                }}
              >
                {/* Left Column (Old / Deletion) */}
                <div
                  style={{
                    display: "flex",
                    backgroundColor: pair.left?.kind === "Deletion" ? "var(--delbg)" : "transparent",
                    borderRight: "1px solid var(--line)",
                    minWidth: "300px",
                  }}
                >
                  <span
                    style={{
                      width: "36px",
                      textAlign: "right",
                      paddingRight: "8px",
                      color: "var(--mut)",
                      userSelect: "none",
                      flexShrink: 0,
                      borderRight: "1px solid var(--line)",
                    }}
                  >
                    {pair.left?.old_no ?? ""}
                  </span>
                  <span style={{ width: "16px", textAlign: "center", userSelect: "none", color: "var(--del)" }}>
                    {pair.left?.kind === "Deletion" ? "-" : " "}
                  </span>
                  <span style={{ flex: 1, paddingRight: "8px", whiteSpace: "pre" }}>
                    {pair.left?.text ?? ""}
                  </span>
                </div>

                {/* Right Column (New / Addition) */}
                <div
                  style={{
                    display: "flex",
                    backgroundColor: pair.right?.kind === "Addition" ? "var(--addbg)" : "transparent",
                    minWidth: "300px",
                  }}
                >
                  <span
                    style={{
                      width: "36px",
                      textAlign: "right",
                      paddingRight: "8px",
                      color: "var(--mut)",
                      userSelect: "none",
                      flexShrink: 0,
                      borderRight: "1px solid var(--line)",
                    }}
                  >
                    {pair.right?.new_no ?? ""}
                  </span>
                  <span style={{ width: "16px", textAlign: "center", userSelect: "none", color: "var(--add)" }}>
                    {pair.right?.kind === "Addition" ? "+" : " "}
                  </span>
                  <span style={{ flex: 1, paddingRight: "8px", whiteSpace: "pre" }}>
                    {pair.right?.text ?? ""}
                  </span>
                </div>
              </div>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};
