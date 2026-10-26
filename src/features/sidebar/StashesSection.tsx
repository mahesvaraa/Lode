import React from "react";
import { Button } from "@/ui";
import type { StashItem } from "@/api/types/stash_item";

interface StashesSectionProps {
  stashes: StashItem[];
  onOpenStashModal: () => void;
}

export const StashesSection: React.FC<StashesSectionProps> = ({
  stashes,
  onOpenStashModal,
}) => {
  return (
    <>
      <div
        data-ctx="sidebar-section"
        data-id="stashes"
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
            STASHES
          </span>
          {stashes.length > 0 && (
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
              {stashes.length}
            </b>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenStashModal}
          style={{ padding: "1px 6px", fontSize: "11px" }}
          title="Управление Stash"
        >
          {stashes.length > 0 ? "Открыть" : "+"}
        </Button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {stashes.length === 0 ? (
          <div style={{ padding: "3px 8px", fontSize: "var(--font-size-xs)", color: "var(--mut)" }}>
            (нет сохранённых)
          </div>
        ) : (
          stashes.slice(0, 5).map((s) => (
            <div
              key={s.selector}
              onClick={onOpenStashModal}
              className="row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 8px",
                fontSize: "var(--font-size-sm)",
                color: "var(--mut)",
                cursor: "pointer",
                borderRadius: "var(--radius-base)",
              }}
              title={s.message}
            >
              <b className="mono" style={{ fontSize: "11px", color: "var(--acc)" }}>
                {s.selector}
              </b>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.message}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
};
