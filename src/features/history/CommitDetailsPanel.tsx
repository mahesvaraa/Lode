import React from "react";
import { EmptyState, Skeleton, Splitter } from "@/ui";
import { useHistoryStore } from "@/store/historyStore";
import { useRepoStore } from "@/store/repoStore";
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

  const [panelSplit, setPanelSplit] = React.useState(260);

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
    </div>
  );
};
