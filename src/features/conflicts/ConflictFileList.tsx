import React from "react";
import type { StatusItem } from "@/api/types/status_item";

interface ConflictFileListProps {
  conflicts: StatusItem[];
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
}

export const ConflictFileList: React.FC<ConflictFileListProps> = ({
  conflicts,
  selectedFilePath,
  onSelectFile,
}) => {
  return (
    <div
      style={{
        width: "260px",
        borderRight: "1px solid var(--line)",
        backgroundColor: "var(--bg2)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--line)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "var(--mut)",
        }}
      >
        Конфликтные файлы ({conflicts.length})
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {conflicts.map((file) => {
          const isSelected = file.path === selectedFilePath;
          return (
            <div
              key={file.path}
              data-ctx="working-file"
              data-id={file.path}
              data-conflicted="true"
              data-staged="false"
              data-untracked="false"
              onClick={() => onSelectFile(file.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: isSelected ? "var(--sel)" : "transparent",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <b
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 5px",
                  borderRadius: "4px",
                  backgroundColor: "var(--del)",
                  color: "#fff",
                }}
              >
                {file.status === "Conflicted" ? "U" : "M"}
              </b>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "var(--font-size-base)",
                  color: isSelected ? "var(--tx)" : "var(--mut)",
                  fontWeight: isSelected ? 500 : 400,
                }}
                title={file.path}
              >
                {file.path}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
