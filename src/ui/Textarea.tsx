import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, style, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`textarea ${error ? "error" : ""} ${className}`}
        style={{
          width: "100%",
          background: "var(--bg2)",
          color: "var(--tx)",
          border: error ? "1px solid var(--del)" : "1px solid var(--line)",
          borderRadius: "var(--radius-base)",
          padding: "8px",
          fontFamily: "inherit",
          fontSize: "var(--font-size-base)",
          lineHeight: "1.45",
          resize: "none",
          outline: "none",
          transition: "border-color 0.15s",
          ...style,
        }}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
