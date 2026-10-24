import React from "react";
import { Button } from "@/ui";
import { useI18n } from "@/lib/i18n";
import type { RepoRefs } from "@/api/types/repo_refs";

interface RemotesSectionProps {
  refs: RepoRefs | null;
  onOpenRemoteModal: () => void;
}

export const RemotesSection: React.FC<RemotesSectionProps> = ({
  refs,
  onOpenRemoteModal,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div
        data-ctx="sidebar-section"
        data-id="remotes"
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
          {t.sidebar.remotes}
        </h6>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenRemoteModal}
          style={{ padding: "1px 6px", fontSize: "11px" }}
          title="Управление удалёнными репозиториями"
        >
          ⚙
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {refs?.remote_branches.length === 0 ? (
          <div style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            (нет remote)
          </div>
        ) : (
          refs?.remote_branches.map((remote) => (
            <div
              key={remote.name}
              data-ctx="remote-branch"
              data-id={remote.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                fontSize: "var(--font-size-sm)",
                color: "var(--mut)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={remote.name}
            >
              <span style={{ fontSize: "11px" }}>🌐</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                {remote.name}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
};
