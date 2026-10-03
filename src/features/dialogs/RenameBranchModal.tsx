import React, { useState } from "react";
import { Input, Modal } from "@/ui";
import { validateBranchName } from "./CreateBranchModal";

interface RenameBranchModalProps {
  isOpen: boolean;
  oldName: string;
  onClose: () => void;
  onConfirm: (oldName: string, newName: string) => Promise<void>;
}

export const RenameBranchModal: React.FC<RenameBranchModalProps> = ({
  isOpen,
  oldName,
  onClose,
  onConfirm,
}) => {
  const [newName, setNewName] = useState(oldName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setNewName(oldName);
      setError(null);
    }
  }, [isOpen, oldName]);

  const validationError = newName ? validateBranchName(newName) : null;
  const isChanged = newName.trim() !== oldName;
  const isValid = isChanged && !validationError;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(oldName, newName.trim());
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка переименования ветки");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Переименовать ветку '${oldName}'`}
      confirmLabel={isSubmitting ? "Переименование..." : "Переименовать"}
      confirmVariant="primary"
      onConfirm={handleSubmit}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "400px", maxWidth: "90vw" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            Новое имя ветки
          </label>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
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

        {error && (
          <div style={{ color: "var(--del)", fontSize: "12px", backgroundColor: "var(--bg3)", padding: "6px 10px", borderRadius: "4px" }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
