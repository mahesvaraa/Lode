import React from "react";
import { useContextMenuStore } from "@/store/contextMenuStore";
import { useRepoStore } from "@/store/repoStore";
import { useRefsStore } from "@/store/refsStore";
import { useStatusStore } from "@/store/statusStore";
import { BranchIcon, CommandIcon, CheckIcon } from "@/ui";
import { OperationProgressIndicator } from "./OperationProgressIndicator";

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
            <CommandIcon size={12} style={{ color: "var(--acc)" }} />
            <span style={{ color: "var(--acc)", fontWeight: 600 }}>Команда:</span>
            <code
              className="mono"
              style={{
                backgroundColor: "var(--bg3)",
                padding: "1px 6px",
                borderRadius: "var(--radius-base)",
                color: "var(--tx)",
              }}
            >
              {hoveredCommandHint}
            </code>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <BranchIcon size={13} style={{ color: "var(--mut)" }} />
              <b style={{ color: "var(--tx)" }}>{currentBranch}</b>
            </span>

            {isStateActive && (
              <span
                style={{
                  backgroundColor: "rgba(170, 75, 65, 0.18)",
                  color: "var(--del)",
                  padding: "1px 5px",
                  borderRadius: "var(--radius-base)",
                  fontWeight: 600,
                  fontSize: "10px",
                }}
              >
                {repoState?.kind.toUpperCase()}
              </span>
            )}

            {status?.branch?.ahead !== undefined && status.branch.ahead > 0 && (
              <span style={{ color: "var(--acc)", fontWeight: 600 }}>+{status.branch.ahead}</span>
            )}
            {status?.branch?.behind !== undefined && status.branch.behind > 0 && (
              <span style={{ color: "var(--del)", fontWeight: 600 }}>-{status.branch.behind}</span>
            )}
          </div>
        )}
      </div>

      {/* Middle: Active background operation with Cancel button */}
      <OperationProgressIndicator />

      {/* Right side: Repo Status & Git version */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {isDirty ? (
            <>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: "var(--del)",
                  borderRadius: "var(--radius-base)",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "var(--del)" }}>Изменения не закоммичены</span>
            </>
          ) : (
            <>
              <CheckIcon size={12} style={{ color: "var(--add)" }} />
              <span style={{ color: "var(--add)" }}>Рабочее дерево чисто</span>
            </>
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
