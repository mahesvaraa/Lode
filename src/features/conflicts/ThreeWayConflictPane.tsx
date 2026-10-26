import React from "react";
import { Textarea, AlertIcon } from "@/ui";
import type { ConflictBlock } from "@/api/types/conflict_block";
import type { SideLabels } from "@/store/conflictStore";

interface ThreeWayConflictPaneProps {
  currentBlock: ConflictBlock | undefined;
  sideLabels: SideLabels;
  resolvedContent: string;
  hasMarkersLeft: boolean;
  onUpdateResolvedContent: (val: string) => void;
}

export const ThreeWayConflictPane: React.FC<ThreeWayConflictPaneProps> = ({
  currentBlock,
  sideLabels,
  resolvedContent,
  hasMarkersLeft,
  onUpdateResolvedContent,
}) => {
  return (
    <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>
      {/* Upper split: Left vs Right */}
      <div
        style={{
          display: "flex",
          flex: 1,
          borderBottom: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        {/* Left Side Panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "rgba(140, 151, 255, 0.08)",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--acc)" }}>
              {sideLabels.leftTitle}
            </span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
              {sideLabels.leftSubtitle}
            </span>
          </div>
          <pre
            className="mono"
            style={{
              flex: 1,
              margin: 0,
              padding: "8px",
              overflow: "auto",
              fontSize: "12px",
              backgroundColor: "var(--bg)",
              color: "var(--tx)",
              lineHeight: 1.45,
            }}
          >
            {currentBlock?.ours || "(пусто)"}
          </pre>
        </div>

        {/* Right Side Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "rgba(195, 155, 255, 0.08)",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--pur)" }}>
              {sideLabels.rightTitle}
            </span>
            <span className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
              {sideLabels.rightSubtitle}
            </span>
          </div>
          <pre
            className="mono"
            style={{
              flex: 1,
              margin: 0,
              padding: "8px",
              overflow: "auto",
              fontSize: "12px",
              backgroundColor: "var(--bg)",
              color: "var(--tx)",
              lineHeight: 1.45,
            }}
          >
            {currentBlock?.theirs || "(пусто)"}
          </pre>
        </div>
      </div>

      {/* Lower Panel: Result Editor */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "var(--bg)",
        }}
      >
        <div
          style={{
            padding: "6px 10px",
            backgroundColor: "var(--bg2)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--tx)" }}>
            Итоговый результат (редактируемый)
          </span>
          {hasMarkersLeft && (
            <span style={{ fontSize: "11px", color: "var(--del)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <AlertIcon size={12} style={{ color: "var(--del)" }} />
              <span>Содержит неразрешённые маркеры конфликта</span>
            </span>
          )}
        </div>

        <Textarea
          value={resolvedContent}
          onChange={(e) => onUpdateResolvedContent(e.target.value)}
          className="mono"
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            resize: "none",
            border: "none",
            borderRadius: 0,
            padding: "8px 10px",
            fontSize: "12px",
            lineHeight: 1.45,
            backgroundColor: "var(--bg)",
            color: "var(--tx)",
            outline: "none",
          }}
          placeholder="Итоговый файл..."
        />
      </div>
    </div>
  );
};
