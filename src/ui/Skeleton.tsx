import React from "react";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "16px",
  borderRadius = "var(--radius-sm)",
  style,
  className = "",
}) => {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "var(--bg3)",
        opacity: 0.6,
        ...style,
      }}
    />
  );
};
