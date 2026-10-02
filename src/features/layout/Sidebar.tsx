import React from "react";
import { useUiStore, type ActiveView } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { t } from "@/lib/i18n";

export const Sidebar: React.FC = () => {
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const currentRepo = useRepoStore((s) => s.currentRepo);

  const status = useStatusStore((s) => s.status);
  const stagedCount = status?.staged.length || 0;
  const unstagedCount = status?.unstaged.length || 0;
  const totalChanges = stagedCount + unstagedCount;
  const conflictsCount = status?.conflicts.length || 0;

  const branchAhead = status?.branch.ahead || 0;
  const branchBehind = status?.branch.behind || 0;
  const trackingStr =
    branchAhead > 0 || branchBehind > 0
      ? `${branchAhead > 0 ? `↑${branchAhead}` : ""} ${branchBehind > 0 ? `↓${branchBehind}` : ""}`.trim()
      : undefined;

  const navItems: {
    id: ActiveView;
    label: string;
    badge?: string | number;
    badgeWarning?: boolean;
  }[] = [
    { id: "hist", label: t.sidebar.history },
    {
      id: "chg",
      label: t.sidebar.changes,
      badge: totalChanges > 0 ? totalChanges : undefined,
    },
    {
      id: "conf",
      label: t.sidebar.conflicts,
      badge: conflictsCount > 0 ? conflictsCount : undefined,
      badgeWarning: conflictsCount > 0,
    },
  ];

  return (
    <aside
      style={{
        width: `${sidebarWidth}px`,
        backgroundColor: "var(--bg2)",
        display: "flex",
        flexDirection: "column",
        padding: "10px 8px",
        overflow: "auto",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveView(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveView(item.id);
                }
              }}
              className={`nav ${isActive ? "on" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 8px",
                borderRadius: "var(--radius-base)",
                cursor: "pointer",
                color: isActive ? "var(--tx)" : "var(--mut)",
                backgroundColor: isActive ? "var(--sel)" : "transparent",
                fontSize: "var(--font-size-base)",
                fontWeight: isActive ? 500 : 400,
                transition: "background-color 0.1s, color 0.1s",
              }}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <b
                  style={{
                    marginLeft: "auto",
                    fontWeight: 500,
                    fontSize: "var(--font-size-xs)",
                    backgroundColor: item.badgeWarning ? "var(--del)" : "var(--bg3)",
                    color: item.badgeWarning ? "#fff" : "var(--tx)",
                    borderRadius: "9px",
                    padding: "0 6px",
                    lineHeight: "16px",
                  }}
                >
                  {item.badge}
                </b>
              )}
            </div>
          );
        })}
      </div>

      {/* Branches Section */}
      <h6
        style={{
          margin: "16px 8px 6px",
          fontSize: "var(--font-size-xs)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--mut)",
        }}
      >
        {t.sidebar.branches}
      </h6>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {currentRepo?.current_branch && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 8px",
              borderRadius: "var(--radius-base)",
              fontSize: "var(--font-size-base)",
              color: "var(--tx)",
              backgroundColor: "var(--sel)",
              fontWeight: 500,
            }}
          >
            <span style={{ color: "var(--acc)", fontSize: "10px" }}>●</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentRepo.current_branch}
            </span>
            {trackingStr && (
              <span
                className="mono"
                style={{
                  marginLeft: "auto",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--mut)",
                }}
              >
                {trackingStr}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Remotes Section */}
      <h6
        style={{
          margin: "16px 8px 6px",
          fontSize: "var(--font-size-xs)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--mut)",
        }}
      >
        {t.sidebar.remotes}
      </h6>
      <div style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
        {status?.branch.upstream || "(нет remote)"}
      </div>

      {/* Tags Section */}
      <h6
        style={{
          margin: "16px 8px 6px",
          fontSize: "var(--font-size-xs)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--mut)",
        }}
      >
        {t.sidebar.tags}
      </h6>
      <div style={{ padding: "4px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
        (будут загружены в этапе 4)
      </div>
    </aside>
  );
};
