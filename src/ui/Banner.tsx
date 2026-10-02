import React from "react";

export type BannerVariant = "info" | "warning" | "danger";

export interface BannerProps {
  variant?: BannerVariant;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Banner: React.FC<BannerProps> = ({
  variant = "warning",
  children,
  action,
  className = "",
  style,
}) => {
  const getBg = () => {
    switch (variant) {
      case "danger":
      case "warning":
        return "var(--delbg)";
      case "info":
      default:
        return "var(--sel)";
    }
  };

  return (
    <div
      role="alert"
      className={`banner ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 14px",
        background: getBg(),
        borderBottom: "1px solid var(--line)",
        fontSize: "var(--font-size-base)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
        {children}
      </div>
      {action && <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>{action}</div>}
    </div>
  );
};
