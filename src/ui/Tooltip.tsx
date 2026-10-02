import React, { useState } from "react";

export interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionStyle = (): React.CSSProperties => {
    switch (position) {
      case "bottom":
        return {
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: "6px",
        };
      case "left":
        return {
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          marginRight: "6px",
        };
      case "right":
        return {
          left: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          marginLeft: "6px",
        };
      case "top":
      default:
        return {
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: "6px",
        };
    }
  };

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            backgroundColor: "var(--tx)",
            color: "var(--bg)",
            fontSize: "var(--font-size-xs)",
            padding: "3px 8px",
            borderRadius: "var(--radius-sm)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 300,
            lineHeight: "1.3",
            fontWeight: 500,
            ...getPositionStyle(),
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
