import React, { useState } from "react";
import { Button, Checkbox, Chip, EmptyState, Splitter, Textarea } from "@/ui";
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

  const [panelWidth, setPanelWidth] = useState(300);
  const [commitMsg, setCommitMsg] = useState("");
  const [isAmend, setIsAmend] = useState(false);

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

  const isPartiallyStaged = (path: string) => {
    return (
      stagedFiles.some((f) => f.path === path) &&
      unstagedFiles.some((f) => f.path === path)
    );
  };

  const firstLineLength = commitMsg.split("\n")[0].length;

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
              {/* Unstaged changes */}
              <div style={{ padding: "8px 10px 4px", display: "flex", alignItems: "center" }}>
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

              <div style={{ display: "flex", flexDirection: "column" }}>
                {unstagedFiles.map((file) => {
                  const isSelected =
                    selectedFile?.path === file.path && !selectedFile.is_staged;
                  const partial = isPartiallyStaged(file.path);
                  const statusChar = getFileStatusLabel(file.status);

                  return (
                    <div
                      key={`unstaged-${file.path}`}
                      onClick={() => handleSelect(file, false)}
                      className={`row ${isSelected ? "on" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "var(--row-height)",
                        padding: "0 10px",
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
                    </div>
                  );
                })}
              </div>

              {/* Staged changes */}
              <div
                style={{
                  padding: "14px 10px 4px",
                  display: "flex",
                  alignItems: "center",
                  borderTop: "1px solid var(--line)",
                  marginTop: "6px",
                }}
              >
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

              <div style={{ display: "flex", flexDirection: "column" }}>
                {stagedFiles.map((file) => {
                  const isSelected =
                    selectedFile?.path === file.path && selectedFile.is_staged;
                  const partial = isPartiallyStaged(file.path);
                  const statusChar = getFileStatusLabel(file.status);

                  return (
                    <div
                      key={`staged-${file.path}`}
                      onClick={() => handleSelect(file, true)}
                      className={`row ${isSelected ? "on" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "var(--row-height)",
                        padding: "0 10px",
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
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

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
            placeholder="Сообщение коммита"
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            style={{ height: "64px" }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

            <Checkbox
              label="Изменить последний"
              checked={isAmend}
              onChange={(e) => setIsAmend(e.target.checked)}
              style={{ fontSize: "var(--font-size-xs)" }}
            />
          </div>

          <Button
            variant="primary"
            disabled={true}
            title="Staging и коммиты будут доступны в Этапе 2"
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
    </div>
  );
};
