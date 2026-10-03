import React, { useState } from "react";
import { Checkbox, Input, Modal } from "@/ui";

interface CreateBranchModalProps {
  isOpen: boolean;
  startPoint: string;
  onClose: () => void;
  onConfirm: (name: string, startPoint: string, switchTo: boolean) => Promise<void>;
}

export function validateBranchName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Имя ветки не может быть пустым";
  if (/\s/.test(trimmed)) return "Имя ветки не должно содержать пробелы";
  if (/[\~^:?*\[\\]/.test(trimmed)) return "Содержит недопустимые символы (~, ^, :, ?, *, [, \\)";
  if (trimmed.startsWith("/") || trimmed.endsWith("/")) return "Не может начинаться или заканчиваться на /";
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) return "Не может начинаться или заканчиваться на .";
  if (trimmed.includes("..")) return "Не может содержать две точки подряд (..)";
  if (trimmed.includes("//")) return "Не может содержать двойной слэш (//)";
  if (trimmed.includes("@{")) return "Не может содержать @{";
  if (trimmed.endsWith(".lock")) return "Не может заканчиваться на .lock";
  return null;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen,
  startPoint,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState("");
  const [targetPoint, setTargetPoint] = useState(startPoint);
  const [switchTo, setSwitchTo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setTargetPoint(startPoint);
      setSwitchTo(true);
      setError(null);
    }
  }, [isOpen, startPoint]);

  const validationError = name ? validateBranchName(name) : null;
  const isValid = name.trim().length > 0 && !validationError;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(name.trim(), targetPoint.trim(), switchTo);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка создания ветки");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Создать ветку"
      confirmLabel={isSubmitting ? "Создание..." : "Создать ветку"}
      confirmVariant="primary"
      onConfirm={handleSubmit}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "420px", maxWidth: "90vw" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            Имя новой ветки
          </label>
          <Input
            autoFocus
            placeholder="feature/new-branch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) handleSubmit();
            }}
          />
          {validationError && (
            <div style={{ color: "var(--del)", fontSize: "11px", marginTop: "4px" }}>
              {validationError}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            Начальная точка (коммит или ветка)
          </label>
          <Input
            value={targetPoint}
            onChange={(e) => setTargetPoint(e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
            <Checkbox
              checked={switchTo}
              onChange={(e) => setSwitchTo(e.target.checked)}
            />
            <span>Сразу переключиться на созданную ветку (checkout)</span>
          </label>
        </div>

        {error && (
          <div style={{ color: "var(--del)", fontSize: "12px", backgroundColor: "var(--bg3)", padding: "6px 10px", borderRadius: "4px" }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
