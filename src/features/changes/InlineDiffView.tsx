import React, { useState } from "react";
import { Button, Modal } from "@/ui";
import { useStatusStore } from "@/store/statusStore";
import { useRepoStore } from "@/store/repoStore";
import { useI18n } from "@/lib/i18n";
import type { DiffHunk } from "@/api/types/diff_hunk";

export interface HunkProps {
  hunks: DiffHunk[];
  filePath: string;
  isStaged: boolean;
}

export const InlineDiffView: React.FC<HunkProps> = ({ hunks, filePath, isStaged }) => {
  const { t } = useI18n();
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const stageHunk = useStatusStore((s) => s.stageHunk);
  const unstageHunk = useStatusStore((s) => s.unstageHunk);
  const stageLines = useStatusStore((s) => s.stageLines);
  const unstageLines = useStatusStore((s) => s.unstageLines);
  const discardLines = useStatusStore((s) => s.discardLines);

  const [selectedLinesMap, setSelectedLinesMap] = useState<Record<number, number[]>>({});
  const [confirmDiscardHunkIdx, setConfirmDiscardHunkIdx] = useState<number | null>(null);

  if (hunks.length === 0) {
    return (
      <div style={{ padding: "24px", color: "var(--mut)", textAlign: "center" }}>
        {t.diff.emptyOrClean}
      </div>
    );
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
              data-ctx="hunk"
              data-id={filePath}
              data-hunk-index={hIdx}
              data-staged={isStaged ? "true" : "false"}
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
                        {t.diff.unstageHunk}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => currentRepo && stageHunk(currentRepo.path, filePath, hIdx)}
                          style={{ padding: "2px 8px", fontSize: "11px" }}
                        >
                          {t.diff.stageHunk}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setConfirmDiscardHunkIdx(hIdx)}
                          style={{ padding: "2px 8px", fontSize: "11px" }}
                        >
                          {t.diff.discardHunk}
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
                      title={t.diff.noNewline}
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
