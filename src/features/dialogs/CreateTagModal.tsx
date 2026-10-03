import React, { useState } from "react";
import { Checkbox, Input, Modal, Textarea } from "@/ui";

interface CreateTagModalProps {
  isOpen: boolean;
  targetHash: string;
  onClose: () => void;
  onConfirm: (name: string, targetHash: string, message?: string) => Promise<void>;
}

export const CreateTagModal: React.FC<CreateTagModalProps> = ({
  isOpen,
  targetHash,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState("");
  const [isAnnotated, setIsAnnotated] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setIsAnnotated(false);
      setMessage("");
      setError(null);
    }
  }, [isOpen]);

  const isValid = name.trim().length > 0 && !/\s/.test(name.trim());

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(
        name.trim(),
        targetHash,
        isAnnotated && message.trim() ? message.trim() : undefined
      );
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка создания тега");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Создать тег"
      confirmLabel={isSubmitting ? "Создание..." : "Создать тег"}
      confirmVariant="primary"
      onConfirm={handleSubmit}
      width="min(460px, 94vw)"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", minWidth: 0 }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            Имя тега
          </label>
          <Input
            autoFocus
            placeholder="v1.0.0"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid && !isAnnotated) handleSubmit();
            }}
          />
          {name && /\s/.test(name) && (
            <div style={{ color: "var(--del)", fontSize: "11px", marginTop: "4px" }}>
              Имя тега не должно содержать пробелы
            </div>
          )}
        </div>

        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
            <Checkbox
              checked={isAnnotated}
              onChange={(e) => setIsAnnotated(e.target.checked)}
            />
            <span>Аннотированный тег (с сообщением)</span>
          </label>
        </div>

        {isAnnotated && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Сообщение тега
            </label>
            <Textarea
              rows={3}
              placeholder="Описание релиза..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
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
