import React from "react";

export interface EmptyStateProps {
  title?: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  style,
  className = "",
}) => {
  return (
    <div
      className={`em ${className}`}
      style={{
        padding: "40px 24px",
        textAlign: "center",
        color: "var(--mut)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        flex: 1,
        ...style,
      }}
    >
      {icon && (
        <div style={{ fontSize: "28px", color: "var(--mut)", opacity: 0.8 }}>
          {icon}
        </div>
      )}
      {title && (
        <h4
          style={{
            margin: 0,
            color: "var(--tx)",
            fontSize: "var(--font-size-md)",
            fontWeight: 500,
          }}
        >
          {title}
        </h4>
      )}
      <p
        style={{
          margin: 0,
          maxWidth: "400px",
          fontSize: "var(--font-size-base)",
          lineHeight: "1.45",
        }}
      >
        {description}
      </p>
      {action && <div style={{ marginTop: "4px" }}>{action}</div>}
    </div>
  );
};
