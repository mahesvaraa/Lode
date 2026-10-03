import React, { useState } from "react";
import { Modal } from "@/ui";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  recoveryHint?: string;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  details,
  recoveryHint,
  confirmLabel = "Подтвердить",
  danger = true,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка операции");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      confirmLabel={isSubmitting ? "Выполнение..." : confirmLabel}
      confirmVariant={danger ? "danger" : "primary"}
      onConfirm={handleSubmit}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "420px", maxWidth: "90vw" }}>
        <div style={{ fontSize: "13px", color: "var(--tx)", lineHeight: 1.4 }}>
          {message}
        </div>

        {details && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--mut)",
              backgroundColor: "var(--bg3)",
              padding: "8px 12px",
              borderRadius: "var(--radius-base)",
              lineHeight: 1.4,
            }}
          >
            {details}
          </div>
        )}

        {recoveryHint && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--acc)",
              backgroundColor: "var(--bg2)",
              border: "1px solid var(--line)",
              padding: "8px 12px",
              borderRadius: "var(--radius-base)",
            }}
          >
            Подсказка: отменить можно будет через: <code className="mono">{recoveryHint}</code>
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
