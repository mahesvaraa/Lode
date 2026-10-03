import React, { useState } from "react";
import { Modal } from "@/ui";

interface ResetModalProps {
  isOpen: boolean;
  targetHash: string;
  shortSubject?: string;
  onClose: () => void;
  onConfirm: (hash: string, mode: "soft" | "mixed" | "hard") => Promise<void>;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  targetHash,
  shortSubject,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<"soft" | "mixed" | "hard">("mixed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shortHash = targetHash.substring(0, 7);

  React.useEffect(() => {
    if (isOpen) {
      setMode("mixed");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(targetHash, mode);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка сброса ветки");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reset текущей ветки к ${shortHash}`}
      confirmLabel={
        isSubmitting
          ? "Сброс..."
          : mode === "hard"
          ? "Сбросить жестко (Hard Reset)"
          : "Сбросить ветку"
      }
      confirmVariant={mode === "hard" ? "danger" : "primary"}
      onConfirm={handleSubmit}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "460px", maxWidth: "90vw" }}>
        <div style={{ fontSize: "12px", color: "var(--tx)" }}>
          Целевой коммит: <b className="mono">{shortHash}</b> {shortSubject && `— ${shortSubject}`}
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "var(--radius-base)",
              backgroundColor: mode === "soft" ? "var(--bg3)" : "transparent",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="reset-mode"
              checked={mode === "soft"}
              onChange={() => setMode("soft")}
              style={{ marginTop: "3px" }}
            />
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>Soft (--soft)</div>
              <div style={{ fontSize: "11px", color: "var(--mut)" }}>
                Переместить указатель ветки. Индекс и рабочее дерево не изменяются (все изменения остаются в индексе).
              </div>
            </div>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "var(--radius-base)",
              backgroundColor: mode === "mixed" ? "var(--bg3)" : "transparent",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="reset-mode"
              checked={mode === "mixed"}
              onChange={() => setMode("mixed")}
              style={{ marginTop: "3px" }}
            />
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>Mixed (--mixed, по умолчанию)</div>
              <div style={{ fontSize: "11px", color: "var(--mut)" }}>
                Переместить ветку и обновить индекс. Изменения сохраняются в рабочей копии как не закоммиченные.
              </div>
            </div>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "var(--radius-base)",
              backgroundColor: mode === "hard" ? "var(--bg3)" : "transparent",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="reset-mode"
              checked={mode === "hard"}
              onChange={() => setMode("hard")}
              style={{ marginTop: "3px" }}
            />
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--del)" }}>
                Hard (--hard, ОПАСНО)
              </div>
              <div style={{ fontSize: "11px", color: "var(--mut)" }}>
                Переместить ветку, очистить индекс и стереть все незакоммиченные файлы рабочей копии!
              </div>
            </div>
          </label>
        </div>

        {mode === "hard" && (
          <div
            style={{
              padding: "10px",
              borderRadius: "var(--radius-base)",
              backgroundColor: "rgba(255, 107, 102, 0.12)",
              border: "1px solid var(--del)",
              color: "var(--tx)",
              fontSize: "11px",
              lineHeight: 1.4,
            }}
          >
            <b style={{ color: "var(--del)", display: "block", marginBottom: "4px" }}>
              Внимание: не закоммиченные данные будут безвозвратно удалены!
            </b>
            Отменить операцию сброса ветки можно будет через меню или команду:{" "}
            <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>
              git reset --hard ORIG_HEAD
            </span>
          </div>
        )}

        {error && (
          <div style={{ color: "var(--del)", fontSize: "12px", backgroundColor: "var(--bg3)", padding: "6px 10px", borderRadius: "4px" }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
