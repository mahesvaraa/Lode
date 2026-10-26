import React from "react";
import { Button, PlusIcon } from "@/ui";
import { useI18n } from "@/lib/i18n";
import type { RepoRefs } from "@/api/types/repo_refs";

interface BranchesSectionProps {
  refs: RepoRefs | null;
  onOpenCreateModal: () => void;
  onSwitchBranch: (name: string) => void;
}

export const BranchesSection: React.FC<BranchesSectionProps> = ({
  refs,
  onOpenCreateModal,
  onSwitchBranch,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div
        data-ctx="sidebar-section"
        data-id="branches"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "16px 8px 6px",
        }}
      >
        <h6
          style={{
            margin: 0,
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--mut)",
          }}
        >
          {t.sidebar.branches}
        </h6>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenCreateModal}
          style={{ padding: "1px 6px" }}
          title="Создать новую ветку"
        >
          <PlusIcon size={12} />
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {refs?.local_branches.map((branch) => {
          const isCurrent = branch.is_head;
          const tracking =
            branch.ahead > 0 || branch.behind > 0
              ? `${branch.ahead > 0 ? `+${branch.ahead}` : ""} ${branch.behind > 0 ? `-${branch.behind}` : ""}`.trim()
              : undefined;

          return (
            <div
              key={branch.name}
              data-ctx="branch"
              data-id={branch.name}
              onClick={() => !isCurrent && onSwitchBranch(branch.name)}
              className="row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "var(--radius-base)",
                fontSize: "var(--font-size-base)",
                color: isCurrent ? "var(--tx)" : "var(--mut)",
                backgroundColor: isCurrent ? "var(--sel)" : "transparent",
                fontWeight: isCurrent ? 600 : 400,
                cursor: isCurrent ? "default" : "pointer",
              }}
              title={isCurrent ? "Текущая ветка" : `Переключиться на ${branch.name}`}
            >
              <span style={{ color: isCurrent ? "var(--acc)" : "transparent", fontSize: "10px" }}>
                ●
              </span>

              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {branch.name}
              </span>

              {tracking && (
                <span className="mono" style={{ fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
                  {tracking}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
