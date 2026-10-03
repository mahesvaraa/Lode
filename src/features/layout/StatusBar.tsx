import React from "react";
import { useContextMenuStore } from "@/store/contextMenuStore";
import { useRepoStore } from "@/store/repoStore";
import { useRefsStore } from "@/store/refsStore";
import { useStatusStore } from "@/store/statusStore";

export const StatusBar: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const gitInfo = useRepoStore((s) => s.gitInfo);
  const repoState = useRefsStore((s) => s.repoState);
  const status = useStatusStore((s) => s.status);
  const hoveredCommandHint = useContextMenuStore((s) => s.hoveredCommandHint);

  if (!currentRepo) return null;

  const currentBranch = currentRepo.current_branch || "HEAD";
  const isStateActive = Boolean(repoState && repoState.kind !== "Normal");
  const isDirty = (status?.staged.length || 0) + (status?.unstaged.length || 0) > 0;

  return (
    <footer
      style={{
        height: "24px",
        backgroundColor: "var(--bg2)",
        borderTop: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        fontSize: "11px",
        color: "var(--mut)",
        userSelect: "none",
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Left side: Branch / Command Hint Preview */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
        {hoveredCommandHint ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--tx)",
            }}
          >
            <span style={{ color: "var(--acc)", fontWeight: 600 }}>⚡ Команда:</span>
            <code
              className="mono"
              style={{
                backgroundColor: "var(--bg3)",
                padding: "1px 6px",
                borderRadius: "3px",
                color: "var(--tx)",
              }}
            >
              {hoveredCommandHint}
            </code>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>⎇</span>
              <b style={{ color: "var(--tx)" }}>{currentBranch}</b>
            </span>

            {isStateActive && (
              <span
                style={{
                  backgroundColor: "rgba(255, 107, 102, 0.15)",
                  color: "var(--del)",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  fontWeight: 600,
                  fontSize: "10px",
                }}
              >
                {repoState?.kind.toUpperCase()}
              </span>
            )}

            {status?.branch?.ahead !== undefined && status.branch.ahead > 0 && (
              <span style={{ color: "var(--acc)" }}>↑{status.branch.ahead}</span>
            )}
            {status?.branch?.behind !== undefined && status.branch.behind > 0 && (
              <span style={{ color: "var(--del)" }}>↓{status.branch.behind}</span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Repo Status & Git version */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <span>
          {isDirty ? (
            <span style={{ color: "var(--del)" }}>● Изменения не закоммичены</span>
          ) : (
            <span style={{ color: "var(--add)" }}>✓ Рабочее дерево чисто</span>
          )}
        </span>

        {gitInfo?.version && (
          <span className="mono" style={{ fontSize: "10px", color: "var(--mut)" }}>
            Git v{gitInfo.version}
          </span>
        )}
      </div>
    </footer>
  );
};
