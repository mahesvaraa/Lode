import React from "react";

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", children, className = "", disabled, style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      fontFamily: "inherit",
      fontSize: size === "sm" ? "12px" : "13px",
      fontWeight: variant === "primary" ? 500 : 400,
      height: size === "sm" ? "26px" : "32px",
      boxSizing: "border-box",
      padding: size === "sm" ? "0 10px" : "0 14px",
      borderRadius: "var(--radius-base)",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.4 : 1,
      transition: "border-color 0.15s, background-color 0.15s, color 0.15s",
      userSelect: "none",
      whiteSpace: "nowrap",
      border: "1px solid var(--line)",
      background: "var(--bg3)",
      color: "var(--tx)",
      ...style,
    };

    if (variant === "primary") {
      baseStyle.background = "var(--acc)";
      baseStyle.borderColor = "var(--acc)";
      baseStyle.color = "#ffffff";
    } else if (variant === "ghost") {
      baseStyle.background = "transparent";
      baseStyle.borderColor = "transparent";
    } else if (variant === "danger") {
      baseStyle.color = "var(--del)";
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`btn btn-${variant} btn-${size} ${className}`}
        style={baseStyle}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
