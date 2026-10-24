import React, { useRef } from "react";
import { Button } from "@/ui";
import { useStatusStore } from "@/store/statusStore";
import { useRepoStore } from "@/store/repoStore";
import { useI18n } from "@/lib/i18n";
import type { DiffLine } from "@/api/types/diff_line";
import type { HunkProps } from "./InlineDiffView";

export const SideBySideDiffView: React.FC<HunkProps> = ({ hunks, filePath, isStaged }) => {
  const { t } = useI18n();
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const stageHunk = useStatusStore((s) => s.stageHunk);
  const unstageHunk = useStatusStore((s) => s.unstageHunk);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  const handleScroll = (source: "left" | "right") => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    const sourceEl = source === "left" ? leftRef.current : rightRef.current;
    const targetEl = source === "left" ? rightRef.current : leftRef.current;

    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop;
      targetEl.scrollLeft = sourceEl.scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  if (hunks.length === 0) {
    return (
      <div style={{ padding: "24px", color: "var(--mut)", textAlign: "center" }}>
        {t.diff.emptyOrClean}
      </div>
    );
  }

  // Pre-calculate line pairs for all hunks
  const hunkData = hunks.map((hunk, hIdx) => {
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

    return { hunk, hIdx, pairs };
  });

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Left Pane (Old / Deletions) - exactly 50% width */}
      <div
        ref={leftRef}
        onScroll={() => handleScroll("left")}
        className="diff-side-by-side mono"
        style={{
          flex: "1 1 50%",
          width: "50%",
          minWidth: 0,
          height: "100%",
          overflow: "auto",
          borderRight: "1px solid var(--line)",
          fontSize: "12px",
          lineHeight: "22px",
          backgroundColor: "var(--bg)",
        }}
      >
        {hunkData.map(({ hunk, hIdx, pairs }) => (
          <div key={`left-hunk-${hIdx}`}>
            {/* Hunk Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "28px",
                padding: "0 10px",
                backgroundColor: "var(--bg2)",
                color: "var(--mut)",
                borderBottom: "1px solid var(--line)",
                userSelect: "none",
                minWidth: "max-content",
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontWeight: 500 }}>
                @@ -{hunk.old_start},{hunk.old_lines} @@
              </span>
              {hunk.header && <span style={{ opacity: 0.8 }}>{hunk.header}</span>}
            </div>

            {/* Lines */}
            {pairs.map((pair, pIdx) => {
              const line = pair.left;
              const isDel = line?.kind === "Deletion";
              return (
                <div
                  key={`left-${hIdx}-${pIdx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "22px",
                    boxSizing: "border-box",
                    backgroundColor: isDel ? "var(--delbg)" : line ? "transparent" : "var(--bg2)",
                    borderBottom: "1px solid rgba(255,255,255,0.02)",
                    minWidth: "max-content",
                  }}
                >
                  <span
                    style={{
                      width: "38px",
                      textAlign: "right",
                      paddingRight: "8px",
                      color: "var(--mut)",
                      userSelect: "none",
                      flexShrink: 0,
                      borderRight: "1px solid var(--line)",
                    }}
                  >
                    {line?.old_no ?? ""}
                  </span>
                  <span
                    style={{
                      width: "18px",
                      textAlign: "center",
                      userSelect: "none",
                      color: isDel ? "var(--del)" : "var(--mut)",
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {isDel ? "-" : " "}
                  </span>
                  <span style={{ paddingRight: "16px", whiteSpace: "pre", color: "var(--tx)" }}>
                    {line?.text ?? ""}
                  </span>
                  {line?.has_crlf && (
                    <span
                      title="CRLF"
                      style={{
                        fontSize: "9px",
                        color: "var(--mut)",
                        opacity: 0.7,
                        marginRight: "4px",
                        userSelect: "none",
                      }}
                    >
                      CRLF
                    </span>
                  )}
                  {line?.no_eol && (
                    <span
                      title={t.diff.noNewline}
                      style={{
                        fontSize: "9px",
                        color: "var(--del)",
                        fontWeight: 600,
                        marginRight: "4px",
                        userSelect: "none",
                      }}
                    >
                      \ No newline
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Right Pane (New / Additions) - exactly 50% width */}
      <div
        ref={rightRef}
        onScroll={() => handleScroll("right")}
        className="diff-side-by-side mono"
        style={{
          flex: "1 1 50%",
          width: "50%",
          minWidth: 0,
          height: "100%",
          overflow: "auto",
          fontSize: "12px",
          lineHeight: "22px",
          backgroundColor: "var(--bg)",
        }}
      >
        {hunkData.map(({ hunk, hIdx, pairs }) => (
          <div key={`right-hunk-${hIdx}`}>
            {/* Hunk Header with Stage Action */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                height: "28px",
                padding: "0 10px",
                backgroundColor: "var(--bg2)",
                color: "var(--mut)",
                borderBottom: "1px solid var(--line)",
                userSelect: "none",
                minWidth: "max-content",
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontWeight: 500 }}>
                @@ +{hunk.new_start},{hunk.new_lines} @@
              </span>

              {isStaged ? (
                <Button
                  size="sm"
                  onClick={() => currentRepo && unstageHunk(currentRepo.path, filePath, hIdx)}
                  style={{ padding: "1px 6px", fontSize: "11px", height: "20px" }}
                >
                  {t.diff.unstageHunk}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => currentRepo && stageHunk(currentRepo.path, filePath, hIdx)}
                  style={{ padding: "1px 6px", fontSize: "11px", height: "20px" }}
                >
                  {t.diff.stageHunk}
                </Button>
              )}
            </div>

            {/* Lines */}
            {pairs.map((pair, pIdx) => {
              const line = pair.right;
              const isAdd = line?.kind === "Addition";
              return (
                <div
                  key={`right-${hIdx}-${pIdx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "22px",
                    boxSizing: "border-box",
                    backgroundColor: isAdd ? "var(--addbg)" : line ? "transparent" : "var(--bg2)",
                    borderBottom: "1px solid rgba(255,255,255,0.02)",
                    minWidth: "max-content",
                  }}
                >
                  <span
                    style={{
                      width: "38px",
                      textAlign: "right",
                      paddingRight: "8px",
                      color: "var(--mut)",
                      userSelect: "none",
                      flexShrink: 0,
                      borderRight: "1px solid var(--line)",
                    }}
                  >
                    {line?.new_no ?? ""}
                  </span>
                  <span
                    style={{
                      width: "18px",
                      textAlign: "center",
                      userSelect: "none",
                      color: isAdd ? "var(--add)" : "var(--mut)",
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {isAdd ? "+" : " "}
                  </span>
                  <span style={{ paddingRight: "16px", whiteSpace: "pre", color: "var(--tx)" }}>
                    {line?.text ?? ""}
                  </span>
                  {line?.has_crlf && (
                    <span
                      title="CRLF"
                      style={{
                        fontSize: "9px",
                        color: "var(--mut)",
                        opacity: 0.7,
                        marginRight: "4px",
                        userSelect: "none",
                      }}
                    >
                      CRLF
                    </span>
                  )}
                  {line?.no_eol && (
                    <span
                      title={t.diff.noNewline}
                      style={{
                        fontSize: "9px",
                        color: "var(--del)",
                        fontWeight: 600,
                        marginRight: "4px",
                        userSelect: "none",
                      }}
                    >
                      \ No newline
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
