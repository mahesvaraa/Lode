import React, { useState } from "react";
import { Button, Checkbox, Input, Modal, Select } from "@/ui";
import { pickFolder } from "@/api/client";
import { validateBranchName } from "./CreateBranchModal";
import type { GitRef } from "@/api/types/git_ref";

interface CreateWorktreeModalProps {
  isOpen: boolean;
  branches: GitRef[];
  onClose: () => void;
  onConfirm: (path: string, branch?: string, newBranch?: string) => Promise<void>;
}

export const CreateWorktreeModal: React.FC<CreateWorktreeModalProps> = ({
  isOpen,
  branches,
  onClose,
  onConfirm,
}) => {
  const [path, setPath] = useState("");
  const [isNewBranch, setIsNewBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.name || "main");
  const [newBranchName, setNewBranchName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPath("");
      setIsNewBranch(false);
      setSelectedBranch(branches[0]?.name || "main");
      setNewBranchName("");
      setError(null);
    }
  }, [isOpen, branches]);

  const handlePickPath = async () => {
    const picked = await pickFolder();
    if (picked) {
      setPath(picked);
    }
  };

  const branchValidationError = isNewBranch && newBranchName ? validateBranchName(newBranchName) : null;
  const isValid = path.trim().length > 0 && (!isNewBranch || (newBranchName.trim().length > 0 && !branchValidationError));

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (isNewBranch) {
        await onConfirm(path.trim(), selectedBranch, newBranchName.trim());
      } else {
        await onConfirm(path.trim(), selectedBranch, undefined);
      }
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Не удалось создать рабочее дерево");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Добавить рабочее дерево (Worktree)"
      confirmLabel={isSubmitting ? "Создание…" : "Создать worktree"}
      onConfirm={handleSubmit}
      isConfirmDisabled={!isValid || isSubmitting}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "var(--mut)", marginBottom: "4px" }}>
            Путь к новой рабочей директории *
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="C:\Projects\my-repo-feature..."
              style={{ flex: 1 }}
            />
            <Button size="sm" onClick={handlePickPath} type="button">
              Обзор…
            </Button>
          </div>
        </div>

        <div>
          <Checkbox
            label="Создать новую ветку для этого worktree"
            checked={isNewBranch}
            onChange={(e) => setIsNewBranch(e.target.checked)}
          />
        </div>

        {isNewBranch ? (
          <>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--mut)", marginBottom: "4px" }}>
                Имя новой ветки *
              </label>
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature/new-worktree"
              />
              {branchValidationError && (
                <span style={{ fontSize: "11px", color: "var(--del)", marginTop: "2px", display: "block" }}>
                  {branchValidationError}
                </span>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--mut)", marginBottom: "4px" }}>
                Базовая ветка (start point)
              </label>
              <Select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                options={branches.map((b) => ({ value: b.name, label: b.name }))}
              />
            </div>
          </>
        ) : (
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--mut)", marginBottom: "4px" }}>
              Ветка для переключения в worktree
            </label>
            <Select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              options={branches.map((b) => ({ value: b.name, label: b.name }))}
            />
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "8px 10px",
              backgroundColor: "var(--delbg)",
              color: "var(--del)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};
