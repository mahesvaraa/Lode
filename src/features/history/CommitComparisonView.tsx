import React, { useState } from "react";
import { Button, EmptyState, Skeleton, Splitter, CloseIcon } from "@/ui";
import { useHistoryStore } from "@/store/historyStore";
import type { FileDiff } from "@/api/types/file_diff";

export const CommitComparisonView: React.FC = () => {
  const baseHash = useHistoryStore((s) => s.comparisonBaseHash);
  const targetHash = useHistoryStore((s) => s.comparisonTargetHash);
  const diffs = useHistoryStore((s) => s.comparisonDiffs);
  const isLoading = useHistoryStore((s) => s.isLoadingComparison);
  const selectedIndex = useHistoryStore((s) => s.selectedComparisonFileIndex);
  const selectFile = useHistoryStore((s) => s.selectComparisonFile);
  const clearComparison = useHistoryStore((s) => s.clearComparison);

  const [panelSplit, setPanelSplit] = useState(280);

  if (!baseHash || !targetHash) return null;

  const currentDiff: FileDiff | undefined =
    diffs && selectedIndex !== null ? diffs[selectedIndex] : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          backgroundColor: "var(--bg2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--tx)" }}>
            Сравнение коммитов:
          </span>
          <code
            className="mono"
            style={{
              backgroundColor: "var(--bg3)",
              padding: "2px 6px",
              borderRadius: "var(--radius-base)",
              fontSize: "12px",
              color: "var(--acc)",
            }}
          >
            {baseHash.substring(0, 7)}
          </code>
          <span style={{ color: "var(--mut)" }}>→</span>
          <code
            className="mono"
            style={{
              backgroundColor: "var(--bg3)",
              padding: "2px 6px",
              borderRadius: "var(--radius-base)",
              fontSize: "12px",
              color: "var(--acc)",
            }}
          >
            {targetHash.substring(0, 7)}
          </code>
          {diffs && (
            <span style={{ fontSize: "11px", color: "var(--mut)" }}>
              ({diffs.length} {diffs.length === 1 ? "файл" : "файлов"})
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={clearComparison}
          style={{ display: "flex", alignItems: "center", gap: "5px" }}
        >
          <CloseIcon size={12} />
          <span>Закрыть сравнение</span>
        </Button>
      </div>

      {isLoading ? (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <Skeleton height="24px" width="50%" />
          <Skeleton height="14px" width="30%" />
          <Skeleton height="120px" width="100%" />
        </div>
      ) : !diffs || diffs.length === 0 ? (
        <EmptyState
          title="Нет различий"
          description="Между выбранными коммитами нет изменённых файлов."
        />
      ) : (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* File list */}
          <div
            style={{
              width: `${panelSplit}px`,
              minWidth: "180px",
              maxWidth: "500px",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--bg2)",
              borderRight: "1px solid var(--line)",
              overflowY: "auto",
            }}
          >
            {diffs.map((d, idx) => {
              const isSelected = idx === selectedIndex;
              const fileName = d.new_path.split("/").pop() || d.new_path;
              return (
                <div
                  key={d.new_path || idx}
                  onClick={() => selectFile(idx)}
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--bg3)" : "transparent",
                    borderLeft: isSelected ? "2px solid var(--acc)" : "2px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    fontSize: "12px",
                    userSelect: "none",
                  }}
                >
                  <span
                    className="mono"
                    title={d.new_path}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: isSelected ? "var(--tx)" : "var(--mut)",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {fileName}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
                    {d.total_additions > 0 && (
                      <span style={{ color: "var(--add)" }}>+{d.total_additions}</span>
                    )}
                    {d.total_deletions > 0 && (
                      <span style={{ color: "var(--del)" }}>-{d.total_deletions}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Splitter
            direction="horizontal"
            onResize={(delta) => setPanelSplit((prev) => Math.max(180, Math.min(500, prev + delta)))}
          />

          {/* Diff preview */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--bg)",
              overflowY: "auto",
            }}
          >
            {currentDiff ? (
              <div style={{ padding: "12px 16px" }}>
                <div style={{ marginBottom: "12px", fontWeight: 600, fontSize: "13px", color: "var(--tx)" }}>
                  {currentDiff.new_path}
                </div>
                {currentDiff.hunks.length === 0 ? (
                  <div style={{ color: "var(--mut)", fontSize: "12px" }}>
                    {currentDiff.is_binary ? "Бинарный файл изменён" : "Файл пуст или изменения отсутствуют"}
                  </div>
                ) : (
                  currentDiff.hunks.map((hunk, hIdx) => (
                    <div
                      key={hIdx}
                      style={{
                        marginBottom: "16px",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        overflow: "hidden",
                        backgroundColor: "var(--bg2)",
                      }}
                    >
                      <div
                        className="mono"
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "var(--bg3)",
                          color: "var(--mut)",
                          fontSize: "11px",
                          borderBottom: "1px solid var(--line)",
                        }}
                      >
                        {hunk.header}
                      </div>
                      <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                        {hunk.lines.map((l, lIdx) => {
                          const bg =
                            l.kind === "Addition"
                              ? "rgba(76, 194, 106, 0.12)"
                              : l.kind === "Deletion"
                              ? "rgba(255, 107, 102, 0.12)"
                              : "transparent";
                          const prefix =
                            l.kind === "Addition" ? "+" : l.kind === "Deletion" ? "-" : " ";
                          const color =
                            l.kind === "Addition"
                              ? "var(--add)"
                              : l.kind === "Deletion"
                              ? "var(--del)"
                              : "var(--tx)";

                          return (
                            <div
                              key={lIdx}
                              style={{
                                display: "flex",
                                backgroundColor: bg,
                                padding: "1px 6px",
                                lineHeight: "1.4",
                              }}
                            >
                              <span
                                style={{
                                  width: "20px",
                                  userSelect: "none",
                                  color: "var(--mut)",
                                  opacity: 0.6,
                                }}
                              >
                                {prefix}
                              </span>
                              <pre
                                style={{
                                  margin: 0,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-all",
                                  color,
                                }}
                              >
                                {l.text}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <EmptyState
                title="Файл не выбран"
                description="Выберите файл из списка слева для просмотра различий"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
