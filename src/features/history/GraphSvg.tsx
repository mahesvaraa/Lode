import React from "react";
import type { GraphNode } from "@/lib/graph";
import { GRAPH_COLORS } from "@/lib/graph";

interface GraphSvgProps {
  node: GraphNode;
  hasParent: boolean;
}

const COL_WIDTH = 14;
const ROW_HEIGHT = 34;
const DOT_RADIUS = 3.5;
const OFFSET_X = 10;
const HALF_ROW = ROW_HEIGHT / 2;

export const GraphSvg: React.FC<GraphSvgProps> = ({ node, hasParent }) => {
  const width = Math.max(1, (node.maxColumn + 1) * COL_WIDTH + OFFSET_X + 6);
  const cx = node.column * COL_WIDTH + OFFSET_X;
  const cy = HALF_ROW;

  return (
    <svg
      width={width}
      height={ROW_HEIGHT}
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* 1. Pass-through vertical lines */}
      {node.passThroughColumns.map((col) => {
        const x = col * COL_WIDTH + OFFSET_X;
        const color = GRAPH_COLORS[col % GRAPH_COLORS.length];
        return (
          <line
            key={`pass-${col}`}
            x1={x}
            y1={0}
            x2={x}
            y2={ROW_HEIGHT}
            stroke={color}
            strokeWidth={2}
          />
        );
      })}

      {/* 2. Merge-in lines coming from above into this commit */}
      {node.mergeInColumns.map((col) => {
        const x1 = col * COL_WIDTH + OFFSET_X;
        const color = GRAPH_COLORS[col % GRAPH_COLORS.length];
        // Cubic bezier curve from (x1, 0) to (cx, cy)
        const d = `M ${x1} 0 C ${x1} ${HALF_ROW / 2}, ${cx} ${HALF_ROW / 2}, ${cx} ${cy}`;
        return (
          <path
            key={`merge-${col}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        );
      })}

      {/* 3. Line from top into this commit (if not a new branch root) */}
      <line
        x1={cx}
        y1={0}
        x2={cx}
        y2={cy}
        stroke={node.color}
        strokeWidth={2}
      />

      {/* 4. Line from this commit down to its first parent */}
      {hasParent && (
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={ROW_HEIGHT}
          stroke={node.color}
          strokeWidth={2}
        />
      )}

      {/* 5. Branch-out lines going to additional parents below */}
      {node.branchOutColumns.map((col) => {
        const x2 = col * COL_WIDTH + OFFSET_X;
        const color = GRAPH_COLORS[col % GRAPH_COLORS.length];
        // Cubic bezier curve from (cx, cy) to (x2, ROW_HEIGHT)
        const d = `M ${cx} ${cy} C ${cx} ${(HALF_ROW + ROW_HEIGHT) / 2}, ${x2} ${(HALF_ROW + ROW_HEIGHT) / 2}, ${x2} ${ROW_HEIGHT}`;
        return (
          <path
            key={`branch-${col}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        );
      })}

      {/* 6. Commit Dot */}
      <circle
        cx={cx}
        cy={cy}
        r={DOT_RADIUS}
        fill={node.color}
        stroke="var(--bg)"
        strokeWidth={1.5}
      />
    </svg>
  );
};
