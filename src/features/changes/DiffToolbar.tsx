import React from "react";
import { Button } from "@/ui";
import { useI18n } from "@/lib/i18n";
import type { FileDiff } from "@/api/types/file_diff";
import type { SelectedFile, DiffMode } from "@/store/statusStore";

interface DiffToolbarProps {
  diff: FileDiff;
  selectedFile: SelectedFile;
  diffMode: DiffMode;
  setDiffMode: (mode: DiffMode) => void;
  ignoreWhitespace: boolean;
  onToggleIgnoreWhitespace: () => void;
  onStageToggle: () => void;
  onDiscardClick: () => void;
}

export const DiffToolbar: React.FC<DiffToolbarProps> = ({
  diff,
  selectedFile,
  diffMode,
  setDiffMode,
  ignoreWhitespace,
  onToggleIgnoreWhitespace,
  onStageToggle,
  onDiscardClick,
}) => {
  const { t } = useI18n();

  return (
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
          <Button size="sm" onClick={onStageToggle}>
            {t.diff.unstageFile}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="primary" onClick={onStageToggle}>
              {t.diff.stageFile}
            </Button>
            <Button size="sm" onClick={onDiscardClick}>
              {t.diff.discardFile}
            </Button>
          </>
        )}
      </div>

      {/* Diff Mode Toggle & Ignore Whitespace */}
      <div style={{ display: "flex", gap: "2px", backgroundColor: "var(--bg3)", padding: "2px", borderRadius: "var(--radius-base)" }}>
        <Button
          size="sm"
          variant={diffMode === "inline" ? "primary" : "ghost"}
          onClick={() => setDiffMode("inline")}
          style={{ padding: "2px 8px", fontSize: "11px" }}
        >
          {t.diff.inline}
        </Button>
        <Button
          size="sm"
          variant={diffMode === "side-by-side" ? "primary" : "ghost"}
          onClick={() => setDiffMode("side-by-side")}
          style={{ padding: "2px 8px", fontSize: "11px" }}
        >
          {t.diff.sideBySide}
        </Button>
      </div>

      <Button
        size="sm"
        variant={ignoreWhitespace ? "primary" : "ghost"}
        onClick={onToggleIgnoreWhitespace}
        style={{ padding: "2px 8px", fontSize: "11px" }}
        title={t.diff.ignoreWhitespace}
      >
        {t.diff.ignoreWhitespace}
      </Button>
    </div>
  );
};
