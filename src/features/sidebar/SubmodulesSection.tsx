import React from "react";
import { Button, FolderIcon } from "@/ui";
import type { SubmoduleInfo } from "@/api/types/submodule_info";

interface SubmodulesSectionProps {
  submodules: SubmoduleInfo[];
  isSyncing: boolean;
  onSyncSubmodules: () => void;
  onSelectSubmodule: (sub: SubmoduleInfo) => void;
  onInitializeSubmodule: (path: string) => void;
}

export const SubmodulesSection: React.FC<SubmodulesSectionProps> = ({
  submodules,
  isSyncing,
  onSyncSubmodules,
  onSelectSubmodule,
  onInitializeSubmodule,
}) => {
  return (
    <>
      <div
        data-ctx="sidebar-section"
        data-id="submodules"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "14px 0 4px",
          padding: "0 8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              color: "var(--mut)",
              letterSpacing: "0.5px",
            }}
          >
            SUBMODULES
          </span>
          {submodules.length > 0 && (
            <b
              style={{
                fontSize: "10px",
                backgroundColor: "var(--bg3)",
                color: "var(--tx)",
                borderRadius: "var(--radius-base)",
                padding: "0 5px",
                lineHeight: "14px",
              }}
            >
              {submodules.length}
            </b>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={isSyncing}
          onClick={onSyncSubmodules}
          style={{ padding: "1px 6px", fontSize: "11px" }}
          title="Синхронизировать и обновить все подмодули (git submodule update --init --recursive)"
        >
          {isSyncing ? "…" : "Обновить"}
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {submodules.length === 0 ? (
          <div style={{ padding: "3px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            (нет подмодулей)
          </div>
        ) : (
          submodules.map((sub) => (
            <div
              key={sub.path}
              onClick={() => onSelectSubmodule(sub)}
              className="row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                fontSize: "var(--font-size-sm)",
                color: "var(--tx)",
                cursor: "pointer",
                borderRadius: "var(--radius-base)",
              }}
              title={`${sub.path} (${sub.describe || sub.head.substring(0, 7)})`}
            >
              <FolderIcon size={12} style={{ color: "var(--mut)", flexShrink: 0 }} />
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {sub.name}
              </span>

              {sub.status_indicator === "-" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInitializeSubmodule(sub.path);
                  }}
                  style={{
                    padding: "0 4px",
                    fontSize: "10px",
                    height: "18px",
                    color: "var(--acc)",
                  }}
                  title="Инициализировать подмодуль"
                >
                  Инит
                </Button>
              )}

              {sub.status_indicator === "+" && (
                <span
                  style={{ fontSize: "10px", color: "var(--add)", fontWeight: 600 }}
                  title="Текущий коммит подмодуля отличается от индекса"
                >
                  +изм
                </span>
              )}

              {sub.status_indicator === "U" && (
                <span
                  style={{ fontSize: "10px", color: "var(--del)", fontWeight: 600 }}
                  title="Конфликт слияния подмодуля"
                >
                  конфликт
                </span>
              )}

              <span
                className="mono"
                style={{ fontSize: "10px", color: "var(--mut)", opacity: 0.8 }}
              >
                {sub.describe || sub.head.substring(0, 7)}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
};
