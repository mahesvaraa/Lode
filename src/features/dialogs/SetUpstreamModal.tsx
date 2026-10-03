import React, { useState } from "react";
import { Input, Modal, Select } from "@/ui";

interface SetUpstreamModalProps {
  isOpen: boolean;
  branchName: string;
  availableRemotes: string[];
  currentUpstream?: string | null;
  onClose: () => void;
  onConfirm: (branchName: string, remoteName: string, remoteBranch: string) => Promise<void>;
}

export const SetUpstreamModal: React.FC<SetUpstreamModalProps> = ({
  isOpen,
  branchName,
  availableRemotes,
  currentUpstream,
  onClose,
  onConfirm,
}) => {
  const initialRemote = availableRemotes[0] || "origin";
  const [remote, setRemote] = useState(initialRemote);
  const [remoteBranch, setRemoteBranch] = useState(branchName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (currentUpstream && currentUpstream.includes("/")) {
        const parts = currentUpstream.split("/");
        setRemote(parts[0]);
        setRemoteBranch(parts.slice(1).join("/"));
      } else {
        setRemote(availableRemotes[0] || "origin");
        setRemoteBranch(branchName);
      }
      setError(null);
    }
  }, [isOpen, branchName, availableRemotes, currentUpstream]);

  const isValid = remote.trim().length > 0 && remoteBranch.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(branchName, remote.trim(), remoteBranch.trim());
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка настройки upstream");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Настройка Upstream для '${branchName}'`}
      confirmLabel={isSubmitting ? "Сохранение..." : "Установить upstream"}
      confirmVariant="primary"
      onConfirm={handleSubmit}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "420px", maxWidth: "90vw" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            Удалённый репозиторий (Remote)
          </label>
          <Select
            value={remote}
            onChange={(e) => setRemote(e.target.value)}
            options={
              availableRemotes.length > 0
                ? availableRemotes.map((r) => ({ value: r, label: r }))
                : [{ value: "origin", label: "origin" }]
            }
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>
            Удалённая ветка
          </label>
          <Input
            value={remoteBranch}
            onChange={(e) => setRemoteBranch(e.target.value)}
            placeholder="main"
          />
        </div>

        <div style={{ fontSize: "11px", color: "var(--mut)" }}>
          Будет выполнена команда: <code className="mono">git branch --set-upstream-to={remote}/{remoteBranch} {branchName}</code>
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
