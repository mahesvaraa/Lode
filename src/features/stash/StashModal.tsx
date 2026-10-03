import React, { useState } from "react";
import { Button, Checkbox, Input, Modal } from "@/ui";
import { useStashStore } from "@/store/stashStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
import type { StashItem } from "@/api/types/stash_item";

interface StashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StashModal: React.FC<StashModalProps> = ({ isOpen, onClose }) => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const stashes = useStashStore((s) => s.stashes);
  const selectedStashDiff = useStashStore((s) => s.selectedStashDiff);
  const selectedSelector = useStashStore((s) => s.selectedSelector);
  const saveStash = useStashStore((s) => s.saveStash);
  const applyStash = useStashStore((s) => s.applyStash);
  const popStash = useStashStore((s) => s.popStash);
  const dropStash = useStashStore((s) => s.dropStash);
  const loadStashDiff = useStashStore((s) => s.loadStashDiff);
  const clearDiff = useStashStore((s) => s.clearDiff);

  const loadStatus = useStatusStore((s) => s.loadStatus);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const showToast = useToastStore((s) => s.showToast);

  const [isCreating, setIsCreating] = useState(false);
  const [stashMessage, setStashMessage] = useState("");
  const [includeUntracked, setIncludeUntracked] = useState(true);

  const [stashToDrop, setStashToDrop] = useState<StashItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!currentRepo) return;
    setError(null);
    try {
      await saveStash(currentRepo.path, stashMessage.trim() || undefined, includeUntracked);
      await loadStatus(currentRepo.path);
      setIsCreating(false);
      setStashMessage("");
      showToast("Изменения сохранены в Stash");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка сохранения в Stash");
    }
  };

  const handleApply = async (selector: string) => {
    if (!currentRepo) return;
    setError(null);
    try {
      await applyStash(currentRepo.path, selector);
      await loadStatus(currentRepo.path);
      showToast(`Stash ${selector} применён к рабочей копии`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка применения Stash");
    }
  };

  const handlePop = async (selector: string) => {
    if (!currentRepo) return;
    setError(null);
    try {
      await popStash(currentRepo.path, selector);
      await loadStatus(currentRepo.path);
      showToast(`Stash ${selector} извлечён`);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Конфликт при извлечении Stash");
      await loadStatus(currentRepo.path);
      // Switch to conflicts view if conflicts occurred
      setActiveView("conf");
      onClose();
    }
  };

  const handleDrop = async () => {
    if (!currentRepo || !stashToDrop) return;
    setError(null);
    try {
      await dropStash(currentRepo.path, stashToDrop.selector);
      setStashToDrop(null);
      showToast(`Stash ${stashToDrop.selector} удалён`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка удаления Stash");
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Управление Stash (отложенные изменения)"
        confirmLabel="Закрыть"
        onConfirm={onClose}
        width="min(640px, 94vw)"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", minWidth: 0 }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "rgba(255, 107, 102, 0.15)",
                color: "var(--del)",
                fontSize: "var(--font-size-xs)",
                borderRadius: "var(--radius-base)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--mut)" }}>
              Сохранённых записей: {stashes.length}
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setIsCreating(true);
                setStashMessage("");
                setError(null);
              }}
            >
              + Создать Stash
            </Button>
          </div>

          {/* Stash List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {stashes.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
                Список Stash пуст. Сохраните текущие незакоммиченные изменения, чтобы освободить рабочее дерево.
              </div>
            ) : (
              stashes.map((s) => {
                const isDiffSelected = selectedSelector === s.selector;
                return (
                  <div
                    key={s.selector}
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1, overflow: "hidden" }}>
                        <b className="mono" style={{ fontSize: "12px", color: "var(--acc)", flexShrink: 0 }}>
                          {s.selector}
                        </b>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--tx)",
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                          title={s.message}
                        >
                          {s.message}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Показать изменения в этом stash"
                          onClick={() => {
                            if (isDiffSelected) {
                              clearDiff();
                            } else if (currentRepo) {
                              loadStashDiff(currentRepo.path, s.selector);
                            }
                          }}
                          style={{ padding: "2px 6px", fontSize: "11px" }}
                        >
                          {isDiffSelected ? "Скрыть diff" : "Diff"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Применить к рабочей копии без удаления из stash"
                          onClick={() => handleApply(s.selector)}
                          style={{ padding: "2px 6px", fontSize: "11px" }}
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          title="Применить к рабочей копии и удалить из stash"
                          onClick={() => handlePop(s.selector)}
                          style={{ padding: "2px 6px", fontSize: "11px" }}
                        >
                          Pop
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Удалить из stash"
                          onClick={() => setStashToDrop(s)}
                          style={{ padding: "2px 6px", fontSize: "11px", color: "var(--del)" }}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Stash Diff Preview */}
          {selectedStashDiff && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                marginTop: "8px",
                borderTop: "1px solid var(--line)",
                paddingTop: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx)" }}>
                  Diff для {selectedSelector}:
                </span>
                <Button size="sm" variant="ghost" onClick={clearDiff} style={{ padding: "1px 6px" }}>
                  ✕
                </Button>
              </div>
              <pre
                className="mono"
                style={{
                  margin: 0,
                  padding: "8px",
                  maxHeight: "180px",
                  overflowY: "auto",
                  fontSize: "11px",
                  backgroundColor: "var(--bg)",
                  color: "var(--tx)",
                  lineHeight: 1.4,
                  borderRadius: "var(--radius-base)",
                  border: "1px solid var(--line)",
                }}
              >
                {selectedStashDiff}
              </pre>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Stash Modal */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Сохранить изменения в Stash"
        confirmLabel="Сохранить"
        onConfirm={handleSave}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--mut)", display: "block", marginBottom: "4px" }}>
              Описание / сообщение stash (опционально)
            </label>
            <Input
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              placeholder="WIP: работа над компонентом"
              autoFocus
            />
          </div>
          <Checkbox
            label="Включить неотслеживаемые файлы (-u / --include-untracked)"
            checked={includeUntracked}
            onChange={(e) => setIncludeUntracked(e.target.checked)}
          />
        </div>
      </Modal>

      {/* Drop Stash Confirmation Modal */}
      <Modal
        isOpen={stashToDrop !== null}
        onClose={() => setStashToDrop(null)}
        title={`Удалить ${stashToDrop?.selector}?`}
        confirmLabel="Удалить безвозвратно"
        isDanger={true}
        onConfirm={handleDrop}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Вы действительно хотите удалить <b>{stashToDrop?.selector}</b> ({stashToDrop?.message})?
          Отложенные в нём изменения будут утеряны.
        </p>
      </Modal>
    </>
  );
};
