import React from "react";
import { Button, PlusIcon, CloseIcon, FolderIcon } from "@/ui";
import type { WorktreeInfo } from "@/api/types/worktree_info";

interface WorktreesSectionProps {
  worktrees: WorktreeInfo[];
  currentRepoPath?: string;
  onOpenCreateWorktree: () => void;
  onSelectWorktree: (path: string) => void;
  onSelectWorktreeToDelete: (wt: WorktreeInfo) => void;
}

export const WorktreesSection: React.FC<WorktreesSectionProps> = ({
  worktrees,
  currentRepoPath,
  onOpenCreateWorktree,
  onSelectWorktree,
  onSelectWorktreeToDelete,
}) => {
  return (
    <>
      <div
        data-ctx="sidebar-section"
        data-id="worktrees"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "14px 0 4px",
          padding: "0 8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              color: "var(--mut)",
              letterSpacing: "0.5px",
            }}
          >
            WORKTREES
          </span>
          {worktrees.length > 0 && (
            <b
              style={{
                fontSize: "10px",
                backgroundColor: "var(--bg3)",
                color: "var(--tx)",
                borderRadius: "var(--radius-base)",
                padding: "0 5px",
                lineHeight: "14px",
              }}
            >
              {worktrees.length}
            </b>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenCreateWorktree}
          style={{ padding: "1px 6px" }}
          title="Добавить рабочее дерево"
        >
          <PlusIcon size={12} />
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {worktrees.length === 0 ? (
          <div style={{ padding: "3px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            (нет worktrees)
          </div>
        ) : (
          worktrees.map((wt) => {
            const isCurrent =
              Boolean(currentRepoPath) &&
              currentRepoPath!.replace(/[\\/]+$/, "").toLowerCase() ===
                wt.path.replace(/[\\/]+$/, "").toLowerCase();
            const folderName = wt.path.split(/[\\/]/).pop() || wt.path;

            return (
              <div
                key={wt.path}
                onClick={() => !isCurrent && onSelectWorktree(wt.path)}
                className={`row ${isCurrent ? "on" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 8px",
                  fontSize: "var(--font-size-sm)",
                  color: isCurrent ? "var(--tx)" : "var(--mut)",
                  cursor: isCurrent ? "default" : "pointer",
                  backgroundColor: isCurrent ? "var(--sel)" : "transparent",
                  borderRadius: "var(--radius-base)",
                }}
                title={`${wt.path} (${wt.branch || wt.head.substring(0, 7)})`}
              >
                <FolderIcon size={12} style={{ color: "var(--mut)", flexShrink: 0 }} />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {folderName}
                </span>

                {wt.is_main ? (
                  <span style={{ fontSize: "10px", color: "var(--acc)", opacity: 0.8 }}>
                    main
                  </span>
                ) : (
                  <span style={{ fontSize: "10px", color: "var(--mut)", opacity: 0.8 }}>
                    {wt.branch || wt.head.substring(0, 7)}
                  </span>
                )}

                {wt.is_locked && (
                  <span
                    style={{ fontSize: "10px", color: "var(--del)", fontWeight: 600 }}
                    title={wt.lock_reason || "Заблокировано"}
                  >
                    locked
                  </span>
                )}

                {!wt.is_main && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWorktreeToDelete(wt);
                    }}
                    style={{
                      padding: "0 4px",
                      fontSize: "10px",
                      height: "18px",
                      color: "var(--mut)",
                    }}
                    title="Удалить worktree"
                  >
                    <CloseIcon size={11} />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
