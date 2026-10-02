import React from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  badgeWarning?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = "",
  style,
}) => {
  return (
    <div
      role="tablist"
      className={`tabs-nav ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        ...style,
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <div
            key={item.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(item.id);
              }
            }}
            className={`nav ${isActive ? "on" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 8px",
              borderRadius: "var(--radius-base)",
              cursor: "pointer",
              color: isActive ? "var(--tx)" : "var(--mut)",
              background: isActive ? "var(--sel)" : "transparent",
              transition: "background-color 0.1s, color 0.1s",
              userSelect: "none",
            }}
          >
            <span style={{ fontSize: "var(--font-size-base)" }}>{item.label}</span>
            {item.badge !== undefined && (
              <b
                style={{
                  marginLeft: "auto",
                  fontWeight: 500,
                  fontSize: "var(--font-size-xs)",
                  background: item.badgeWarning ? "var(--del)" : "var(--bg3)",
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
  );
};
