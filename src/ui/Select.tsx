import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, style, className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`select ${className}`}
        style={{
          background: "var(--bg2)",
          color: "var(--tx)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-base)",
          padding: "4px 8px",
          fontFamily: "inherit",
          fontSize: "var(--font-size-base)",
          outline: "none",
          cursor: "pointer",
          ...style,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = "Select";
