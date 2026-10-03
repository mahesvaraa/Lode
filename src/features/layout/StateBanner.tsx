import React from "react";
import { Button } from "@/ui";
import { useRefsStore } from "@/store/refsStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useUiStore } from "@/store/uiStore";

export const StateBanner: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const repoState = useRefsStore((s) => s.repoState);
  const abortMerge = useRefsStore((s) => s.abortMerge);
  const loadStatus = useStatusStore((s) => s.loadStatus);
  const setActiveView = useUiStore((s) => s.setActiveView);

  if (!repoState || repoState.kind === "Normal") {
    return null;
  }

  const handleAbort = async () => {
    if (!currentRepo) return;
    try {
      if (repoState.kind === "Merge") {
        await abortMerge(currentRepo.path);
        await loadStatus(currentRepo.path);
      }
    } catch (err) {
      console.error("Failed to abort operation:", err);
    }
  };

  const getBackgroundColor = () => {
    switch (repoState.kind) {
      case "Merge":
        return "#78350f"; // Dark amber/orange
      case "Rebase":
        return "#701a75"; // Dark fuchsia
      default:
        return "#1e293b";
    }
  };

  return (
    <div
      data-ctx="state-banner"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        backgroundColor: getBackgroundColor(),
        color: "#ffffff",
        fontSize: "var(--font-size-sm)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
        zIndex: 100,
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>⚠️</span>
        <b style={{ fontWeight: 600 }}>{repoState.message}</b>
        {repoState.kind === "Merge" && (
          <span style={{ opacity: 0.85 }}>
            — разрешите конфликты в файлах или отмените слияние
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {repoState.kind === "Merge" && (
          <Button
            size="sm"
            onClick={() => setActiveView("chg")}
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", borderColor: "transparent" }}
          >
            К конфликтам / изменениям
          </Button>
        )}

        <Button
          size="sm"
          onClick={handleAbort}
          style={{ backgroundColor: "var(--del)", color: "#fff", borderColor: "transparent" }}
        >
          Отменить слияние
        </Button>
      </div>
    </div>
  );
};
