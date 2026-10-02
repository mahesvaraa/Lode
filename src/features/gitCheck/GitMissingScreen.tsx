import React, { useState } from "react";
import { Button, Input } from "@/ui";
import { t } from "@/lib/i18n";
import { setCustomGitPath } from "@/api/client";
import { useRepoStore } from "@/store/repoStore";
import { useToastStore } from "@/store/toastStore";

export const GitMissingScreen: React.FC = () => {
  const gitInfo = useRepoStore((s) => s.gitInfo);
  const setGitInfo = useRepoStore((s) => s.setGitInfo);
  const showToast = useToastStore((s) => s.showToast);

  const [manualPath, setManualPath] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const isTooOld = gitInfo?.available && !gitInfo.is_valid_version;
  const title = isTooOld
    ? t.gitCheck.versionTooOldTitle
    : t.gitCheck.notFoundTitle;

  const desc = isTooOld
    ? gitInfo?.error || "Установленная версия Git устарела. Требуется Git 2.30.0+."
    : t.gitCheck.notFoundDesc;

  const handleApplyPath = async () => {
    if (!manualPath.trim()) return;
    setIsApplying(true);
    try {
      const updated = await setCustomGitPath(manualPath.trim());
      setGitInfo(updated);
      if (updated.available && updated.is_valid_version) {
        showToast("Git успешно настроен!", "success");
      } else {
        showToast(updated.error || "Указанный файл не является валидным Git", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Ошибка при установке пути к Git", "error");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRetry = async () => {
    setIsApplying(true);
    try {
      const updated = await setCustomGitPath(null);
      setGitInfo(updated);
      if (updated.available && updated.is_valid_version) {
        showToast("Git найден!", "success");
      } else {
        showToast("Git всё ещё не обнаружен", "error");
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "24px",
        backgroundColor: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          backgroundColor: "var(--bg2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-base)",
              backgroundColor: "var(--delbg)",
              color: "var(--del)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            !
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "var(--font-size-lg)",
                fontWeight: 600,
                color: "var(--tx)",
              }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "var(--font-size-base)",
                color: "var(--mut)",
              }}
            >
              {desc}
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg3)",
            padding: "12px 14px",
            borderRadius: "var(--radius-base)",
            fontSize: "var(--font-size-sm)",
            lineHeight: 1.5,
            color: "var(--tx)",
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: "4px" }}>Инструкция:</div>
          <div>{t.gitCheck.installInstructions}</div>
          {gitInfo?.path && (
            <div style={{ marginTop: "6px", color: "var(--mut)" }}>
              Текущий путь: <span className="mono">{gitInfo.path}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            htmlFor="git-path-input"
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              color: "var(--mut)",
            }}
          >
            {t.gitCheck.specifyPath}
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <Input
              id="git-path-input"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder={t.gitCheck.manualPathPlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApplyPath();
              }}
            />
            <Button
              variant="primary"
              disabled={isApplying || !manualPath.trim()}
              onClick={handleApplyPath}
            >
              {t.gitCheck.applyPath}
            </Button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
          <Button variant="default" disabled={isApplying} onClick={handleRetry}>
            {t.actions.retry}
          </Button>
        </div>
      </div>
    </div>
  );
};
