import React from "react";
import { useUiStore, type ActiveView } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { t } from "@/lib/i18n";

export const Sidebar: React.FC = () => {
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const currentRepo = useRepoStore((s) => s.currentRepo);

  const navItems: { id: ActiveView; label: string; badge?: string }[] = [
    { id: "hist", label: t.sidebar.history },
    { id: "chg", label: t.sidebar.changes, badge: "0" },
    { id: "conf", label: t.sidebar.conflicts },
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
                    backgroundColor: "var(--bg3)",
                    color: "var(--tx)",
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
            <span>{currentRepo.current_branch}</span>
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
        (будут загружены в этапе 4)
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
