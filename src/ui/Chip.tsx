import React from "react";

export type ChipVariant = "default" | "head" | "tag" | "status";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  statusKind?: "M" | "A" | "D" | "U";
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  variant = "default",
  statusKind,
  children,
  style,
  className = "",
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 6px",
    borderRadius: "var(--radius-base)",
    fontSize: "var(--font-size-xs)",
    lineHeight: "18px",
    whiteSpace: "nowrap",
    marginRight: "4px",
    background: "var(--sel)",
    color: "var(--acc)",
    fontFamily: "var(--font-ui)",
    ...style,
  };

  if (variant === "head") {
    baseStyle.background = "var(--acc)";
    baseStyle.color = "#ffffff";
    baseStyle.fontWeight = 500;
  } else if (variant === "tag") {
    baseStyle.background = "var(--bg3)";
    baseStyle.color = "var(--mut)";
  } else if (variant === "status") {
    baseStyle.background = "transparent";
    baseStyle.padding = "0 2px";
    baseStyle.fontWeight = 600;
    if (statusKind === "M") baseStyle.color = "var(--acc)";
    else if (statusKind === "A") baseStyle.color = "var(--add)";
    else if (statusKind === "D") baseStyle.color = "var(--del)";
    else if (statusKind === "U") baseStyle.color = "var(--pur)";
  }

  return (
    <span
      className={`chip chip-${variant} ${className}`}
      style={baseStyle}
      {...props}
    >
      {children}
    </span>
  );
};
