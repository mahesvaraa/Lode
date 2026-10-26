import React from "react";
import { Chip, TagIcon } from "@/ui";
import { GraphSvg } from "./GraphSvg";
import type { Commit } from "@/api/types/commit";
import type { GraphNode } from "@/lib/graph";

interface CommitRowProps {
  commit: Commit;
  node: GraphNode;
  isSelected: boolean;
  isCompared?: boolean;
  comparedRole?: "base" | "target";
  onSelect: (e: React.MouseEvent) => void;
}

export const CommitRow: React.FC<CommitRowProps> = ({
  commit,
  node,
  isSelected,
  isCompared,
  comparedRole,
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
      className={`row ${isSelected ? "on" : ""} ${isCompared ? "compared" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        height: "var(--row-height)",
        paddingRight: "10px",
        cursor: "pointer",
        backgroundColor: isSelected
          ? "var(--sel)"
          : isCompared
          ? "rgba(140, 151, 255, 0.12)"
          : "transparent",
        outline: isCompared ? "1px solid var(--acc)" : "none",
        outlineOffset: "-1px",
        userSelect: "none",
        fontSize: "var(--font-size-base)",
        overflow: "hidden",
      }}
    >
      {/* Git Graph Visualizer */}
      <GraphSvg node={node} hasParent={hasParent} />

      {comparedRole && (
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--acc)",
            backgroundColor: "var(--bg3)",
            border: "1px solid var(--acc)",
            borderRadius: "3px",
            padding: "0 4px",
            marginRight: "6px",
            lineHeight: "16px",
            flexShrink: 0,
          }}
        >
          {comparedRole === "base" ? "A" : "B"}
        </span>
      )}

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
                <Chip
                  key={idx}
                  variant="tag"
                  style={{
                    color: "var(--tx)",
                    borderColor: "var(--line)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <TagIcon size={10} style={{ color: "var(--mut)" }} />
                  <span>{ref.name}</span>
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
