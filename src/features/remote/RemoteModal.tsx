import React, { useState } from "react";
import { Button, Input, Modal } from "@/ui";
import { useRemoteStore } from "@/store/remoteStore";
import { useRepoStore } from "@/store/repoStore";
import type { Remote } from "@/api/types/remote";

interface RemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RemoteModal: React.FC<RemoteModalProps> = ({ isOpen, onClose }) => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const remotes = useRemoteStore((s) => s.remotes);
  const addRemote = useRemoteStore((s) => s.addRemote);
  const removeRemote = useRemoteStore((s) => s.removeRemote);
  const renameRemote = useRemoteStore((s) => s.renameRemote);
  const setRemoteUrl = useRemoteStore((s) => s.setRemoteUrl);

  const [isAdding, setIsAdding] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState("");
  const [newRemoteUrl, setNewRemoteUrl] = useState("");

  const [editingRemote, setEditingRemote] = useState<Remote | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const [renamingRemote, setRenamingRemote] = useState<Remote | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deletingRemote, setDeletingRemote] = useState<Remote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!currentRepo || !newRemoteName.trim() || !newRemoteUrl.trim()) return;
    setError(null);
    try {
      await addRemote(currentRepo.path, newRemoteName.trim(), newRemoteUrl.trim());
      setIsAdding(false);
      setNewRemoteName("");
      setNewRemoteUrl("");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка добавления remote");
    }
  };

  const handleEditUrl = async () => {
    if (!currentRepo || !editingRemote || !editUrl.trim()) return;
    setError(null);
    try {
      await setRemoteUrl(currentRepo.path, editingRemote.name, editUrl.trim());
      setEditingRemote(null);
      setEditUrl("");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка изменения URL");
    }
  };

  const handleRename = async () => {
    if (!currentRepo || !renamingRemote || !renameName.trim()) return;
    setError(null);
    try {
      await renameRemote(currentRepo.path, renamingRemote.name, renameName.trim());
      setRenamingRemote(null);
      setRenameName("");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка переименования remote");
    }
  };

  const handleDelete = async () => {
    if (!currentRepo || !deletingRemote) return;
    setError(null);
    try {
      await removeRemote(currentRepo.path, deletingRemote.name);
      setDeletingRemote(null);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка удаления remote");
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Управление удалёнными репозиториями (Remotes)"
        confirmLabel="Закрыть"
        onConfirm={onClose}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "460px" }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "rgba(255, 107, 102, 0.15)",
                border: "1px solid var(--del)",
                borderRadius: "var(--radius-base)",
                color: "var(--del)",
                fontSize: "var(--font-size-xs)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--mut)" }}>
              Настроенные remotes: {remotes.length}
            </span>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setIsAdding(true);
                setNewRemoteName("origin");
                setNewRemoteUrl("");
                setError(null);
              }}
            >
              + Добавить remote
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {remotes.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
                Нет настроенных удалённых репозиториев
              </div>
            ) : (
              remotes.map((remote) => (
                <div
                  key={remote.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg3)",
                    borderRadius: "var(--radius-base)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <b style={{ fontSize: "var(--font-size-base)", color: "var(--tx)" }}>{remote.name}</b>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRemote(remote);
                          setEditUrl(remote.fetch_url);
                          setError(null);
                        }}
                        style={{ padding: "2px 6px", fontSize: "11px" }}
                      >
                        Изменить URL
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRenamingRemote(remote);
                          setRenameName(remote.name);
                          setError(null);
                        }}
                        style={{ padding: "2px 6px", fontSize: "11px" }}
                      >
                        Переименовать
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeletingRemote(remote);
                          setError(null);
                        }}
                        style={{ padding: "2px 6px", fontSize: "11px", color: "var(--del)" }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>

                  <div
                    className="mono"
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--mut)",
                      wordBreak: "break-all",
                    }}
                    title={remote.display_fetch_url}
                  >
                    fetch: {remote.display_fetch_url}
                  </div>
                  {remote.display_push_url !== remote.display_fetch_url && (
                    <div
                      className="mono"
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--mut)",
                        wordBreak: "break-all",
                      }}
                      title={remote.display_push_url}
                    >
                      push: {remote.display_push_url}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Add Remote Modal */}
      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="Добавить удалённый репозиторий"
        confirmLabel="Добавить"
        onConfirm={handleAdd}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginBottom: "4px" }}>
              Имя remote (например: origin, upstream)
            </label>
            <Input
              value={newRemoteName}
              onChange={(e) => setNewRemoteName(e.target.value)}
              placeholder="origin"
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginBottom: "4px" }}>
              URL репозитория (HTTPS или SSH)
            </label>
            <Input
              value={newRemoteUrl}
              onChange={(e) => setNewRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
            />
          </div>
        </div>
      </Modal>

      {/* Edit URL Modal */}
      <Modal
        isOpen={editingRemote !== null}
        onClose={() => setEditingRemote(null)}
        title={`Изменить URL для ${editingRemote?.name}`}
        confirmLabel="Сохранить"
        onConfirm={handleEditUrl}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "12px", color: "var(--mut)", display: "block" }}>
            Новый URL (пароли будут замаскированы в интерфейсе)
          </label>
          <Input
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            autoFocus
          />
        </div>
      </Modal>

      {/* Rename Remote Modal */}
      <Modal
        isOpen={renamingRemote !== null}
        onClose={() => setRenamingRemote(null)}
        title={`Переименовать remote ${renamingRemote?.name}`}
        confirmLabel="Переименовать"
        onConfirm={handleRename}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={{ fontSize: "12px", color: "var(--mut)", display: "block" }}>
            Новое имя
          </label>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="origin"
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete Remote Confirmation Modal */}
      <Modal
        isOpen={deletingRemote !== null}
        onClose={() => setDeletingRemote(null)}
        title={`Удалить remote ${deletingRemote?.name}?`}
        confirmLabel="Удалить remote"
        isDanger={true}
        onConfirm={handleDelete}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы действительно хотите удалить remote <b>{deletingRemote?.name}</b>?
          Это действие удалит ссылку на удалённый репозиторий, но не затронет ваши локальные коммиты.
        </p>
      </Modal>
    </>
  );
};
