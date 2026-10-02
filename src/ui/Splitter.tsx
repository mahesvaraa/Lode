import React, { useCallback, useEffect, useState } from "react";

export interface SplitterProps {
  onResize: (delta: number) => void;
  direction?: "horizontal" | "vertical";
  className?: string;
  style?: React.CSSProperties;
}

export const Splitter: React.FC<SplitterProps> = ({
  onResize,
  direction = "horizontal",
  className = "",
  style,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (direction === "horizontal") {
        onResize(e.movementX);
      } else {
        onResize(e.movementY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onResize, direction]);

  return (
    <div
      role="separator"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {
        if (direction === "horizontal") {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onResize(-10);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onResize(10);
          }
        }
      }}
      className={`splitter ${isDragging ? "dragging" : ""} ${className}`}
      style={{
        width: direction === "horizontal" ? "1px" : "100%",
        height: direction === "horizontal" ? "100%" : "1px",
        backgroundColor: "var(--line)",
        cursor: direction === "horizontal" ? "col-resize" : "row-resize",
        position: "relative",
        userSelect: "none",
        flexShrink: 0,
        zIndex: 10,
        ...style,
      }}
    >
      {/* Invisible grab area */}
      <div
        style={{
          position: "absolute",
          inset: direction === "horizontal" ? "0 -3px" : "-3px 0",
        }}
      />
    </div>
  );
};
