import React from "react";

export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const List = React.forwardRef<HTMLDivElement, ListProps>(
  ({ children, style, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="list"
        className={`list-container ${className}`}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "auto",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
List.displayName = "List";

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Row = React.forwardRef<HTMLDivElement, RowProps>(
  ({ selected, active, disabled, children, style, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="listitem"
        tabIndex={disabled ? -1 : 0}
        className={`row ${selected || active ? "on" : ""} ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          height: "var(--row-height)",
          paddingLeft: "10px",
          paddingRight: "12px",
          cursor: disabled ? "default" : "pointer",
          gap: "10px",
          whiteSpace: "nowrap",
          background: selected || active ? "var(--sel)" : "transparent",
          color: "inherit",
          opacity: disabled ? 0.5 : 1,
          transition: "background-color 0.1s",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Row.displayName = "Row";
