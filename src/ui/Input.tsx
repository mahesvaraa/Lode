import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, style, className = "", ...props }, ref) => {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          position: "relative",
          width: "100%",
        }}
      >
        {icon && (
          <span
            style={{
              position: "absolute",
              left: "8px",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
              color: "var(--mut)",
            }}
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`input ${className}`}
          style={{
            width: "100%",
            background: "var(--bg2)",
            color: "var(--tx)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-base)",
            padding: icon ? "5px 8px 5px 28px" : "5px 8px",
            fontFamily: "inherit",
            fontSize: "var(--font-size-base)",
            outline: "none",
            transition: "border-color 0.15s",
            ...style,
          }}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
