import React from "react";
import { Chip } from "@/ui";
import { GraphSvg } from "./GraphSvg";
import type { Commit } from "@/api/types/commit";
import type { GraphNode } from "@/lib/graph";

interface CommitRowProps {
  commit: Commit;
  node: GraphNode;
  isSelected: boolean;
  onSelect: () => void;
}

export const CommitRow: React.FC<CommitRowProps> = ({
  commit,
  node,
  isSelected,
  onSelect,
}) => {
  const hasParent = commit.parents.length > 0;

  const formatDate = (unixSec: number | bigint) => {
    const sec = typeof unixSec === "bigint" ? Number(unixSec) : unixSec;
    const date = new Date(sec * 1000);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div
      onClick={onSelect}
      className={`row ${isSelected ? "on" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        height: "var(--row-height)",
        paddingRight: "10px",
        cursor: "pointer",
        backgroundColor: isSelected ? "var(--sel)" : "transparent",
        userSelect: "none",
        fontSize: "var(--font-size-base)",
        overflow: "hidden",
      }}
    >
      {/* Git Graph Visualizer */}
      <GraphSvg node={node} hasParent={hasParent} />

      {/* Ref Chips (HEAD, branches, tags) */}
      {commit.refs.length > 0 && (
        <div style={{ display: "flex", gap: "4px", marginRight: "6px", flexShrink: 0 }}>
          {commit.refs.map((ref, idx) => {
            if (ref.kind === "Head") {
              return (
                <Chip key={idx} variant="head">
                  HEAD
                </Chip>
              );
            }
            if (ref.kind === "Tag") {
              return (
                <Chip key={idx} variant="tag" style={{ color: "#ca8a04", borderColor: "#ca8a04" }}>
                  🏷 {ref.name}
                </Chip>
              );
            }
            if (ref.kind === "RemoteBranch") {
              return (
                <Chip key={idx} variant="default" style={{ opacity: 0.8 }}>
                  {ref.name}
                </Chip>
              );
            }
            return (
              <Chip key={idx} variant="default">
                {ref.name}
              </Chip>
            );
          })}
        </div>
      )}

      {/* Commit Subject */}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--tx)",
          fontWeight: isSelected ? 500 : 400,
        }}
      >
        {commit.subject}
      </span>

      {/* Author Name */}
      <span
        style={{
          width: "120px",
          textAlign: "right",
          color: "var(--mut)",
          fontSize: "var(--font-size-sm)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
          marginLeft: "8px",
        }}
      >
        {commit.author_name}
      </span>

      {/* Date */}
      <span
        style={{
          width: "80px",
          textAlign: "right",
          color: "var(--mut)",
          fontSize: "var(--font-size-xs)",
          flexShrink: 0,
          marginLeft: "8px",
        }}
      >
        {formatDate(commit.author_date)}
      </span>

      {/* Short Hash */}
      <span
        className="mono"
        style={{
          width: "60px",
          textAlign: "right",
          color: "var(--mut)",
          fontSize: "var(--font-size-xs)",
          flexShrink: 0,
          marginLeft: "8px",
        }}
      >
        {commit.short_hash}
      </span>
    </div>
  );
};
