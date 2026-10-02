import React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, style, className = "", id, ...props }, ref) => {
    const inputId = id || (typeof label === "string" ? label.replace(/\s+/g, "-").toLowerCase() : undefined);

    return (
      <label
        htmlFor={inputId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          fontSize: "var(--font-size-base)",
          color: "inherit",
          userSelect: "none",
          ...style,
        }}
        className={`checkbox-label ${className}`}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          style={{
            cursor: "pointer",
            accentColor: "var(--acc)",
            width: "14px",
            height: "14px",
          }}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
