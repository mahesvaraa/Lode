import React, { useState } from "react";
import { Modal } from "@/ui";

interface MergeParentModalProps {
  isOpen: boolean;
  actionTitle: string; // "Cherry-pick" or "Revert"
  commitHash: string;
  parentHashes: string[];
  onClose: () => void;
  onConfirm: (parentIndex: number) => Promise<void>;
}

export const MergeParentModal: React.FC<MergeParentModalProps> = ({
  isOpen,
  actionTitle,
  commitHash,
  parentHashes,
  onClose,
  onConfirm,
}) => {
  const [selectedParent, setSelectedParent] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedParent(1);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(selectedParent);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка операции");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shortHash = commitHash.substring(0, 7);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${actionTitle} merge-коммита (${shortHash})`}
      confirmLabel={isSubmitting ? "Выполнение..." : `Выполнить с -m ${selectedParent}`}
      confirmVariant="primary"
      onConfirm={handleSubmit}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "420px", maxWidth: "90vw" }}>
        <div style={{ fontSize: "12px", color: "var(--tx)", lineHeight: 1.4 }}>
          Этот коммит является результатом слияния и имеет несколько родителей. Выберите родительскую ветку для применения изменений (флаг <code>-m</code>):
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {parentHashes.map((pHash, idx) => {
            const parentNumber = idx + 1;
            const pShort = pHash.substring(0, 7);
            const isSelected = selectedParent === parentNumber;
            return (
              <label
                key={pHash}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-base)",
                  backgroundColor: isSelected ? "var(--bg3)" : "transparent",
                  border: isSelected ? "1px solid var(--acc)" : "1px solid var(--line)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="merge-parent"
                  checked={isSelected}
                  onChange={() => setSelectedParent(parentNumber)}
                />
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>
                    Родитель #{parentNumber} (-m {parentNumber})
                  </div>
                  <div className="mono" style={{ fontSize: "11px", color: "var(--mut)" }}>
                    {pShort}
                  </div>
                </div>
              </label>
            );
          })}
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
