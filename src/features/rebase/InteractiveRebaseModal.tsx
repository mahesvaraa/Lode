import React, { useEffect, useState } from "react";
import { Button, Modal, Textarea } from "@/ui";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
import { getRebaseTodoList, startInteractiveRebase } from "@/api/client";
import { shortenHash } from "@/lib/format";
import type { RebaseActionKind } from "@/api/types/rebase_action_kind";
import type { RebaseTodoItem } from "@/api/types/rebase_todo_item";

interface InteractiveRebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseRef: string;
}

export const InteractiveRebaseModal: React.FC<InteractiveRebaseModalProps> = ({
  isOpen,
  onClose,
  baseRef,
}) => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadHistory = useHistoryStore((s) => s.loadInitial);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const showToast = useToastStore((s) => s.showToast);

  const [items, setItems] = useState<RebaseTodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reword modal state
  const [rewordIndex, setRewordIndex] = useState<number | null>(null);
  const [rewordText, setRewordText] = useState("");

  useEffect(() => {
    if (!isOpen || !currentRepo || !baseRef) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadItems = async () => {
      try {
        const todoItems = await getRebaseTodoList(currentRepo.path, baseRef);
        if (isMounted) setItems(todoItems);
      } catch (err: unknown) {
        const errObj = err as { message?: string };
        if (isMounted) setError(errObj.message || "Ошибка загрузки списка для rebase");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentRepo, baseRef]);

  const hasPublishedCommits = items.some((it) => it.is_published && it.action !== "Drop");

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setItems(newItems);
  };

  const handleActionChange = (index: number, action: RebaseActionKind) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], action };

    // If first item becomes squash or fixup, convert to pick because git requires the first to be pick
    if (index === 0 && (action === "Squash" || action === "Fixup")) {
      newItems[0].action = "Pick";
      showToast("Первый коммит в цепочке не может быть squash или fixup", "info");
    }

    setItems(newItems);
  };

  const openReword = (index: number) => {
    setRewordIndex(index);
    setRewordText(items[index].reword_message || items[index].subject);
  };

  const saveReword = () => {
    if (rewordIndex === null) return;
    const newItems = [...items];
    newItems[rewordIndex] = {
      ...newItems[rewordIndex],
      reword_message: rewordText.trim() || newItems[rewordIndex].subject,
      action: "Reword",
    };
    setItems(newItems);
    setRewordIndex(null);
  };

  const refreshAll = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadStatus(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadRefs(currentRepo.path),
      loadHistory(currentRepo.path),
    ]);
  };

  const handleStartRebase = async () => {
    if (!currentRepo || items.length === 0) return;
    setIsStarting(true);
    setError(null);
    try {
      const state = await startInteractiveRebase(currentRepo.path, baseRef, items);
      await refreshAll();
      onClose();

      if (state.kind === "Rebase") {
        showToast("Rebase приостановлен из-за конфликта", "info");
        setActiveView("conf");
      } else {
        showToast("Интерактивный rebase успешно завершён");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Ошибка выполнения интерактивного rebase");
    } finally {
      setIsStarting(false);
    }
  };

  // Compute preview metrics
  const activeCount = items.filter((it) => it.action !== "Drop" && it.action !== "Squash" && it.action !== "Fixup").length;
  const squashedCount = items.filter((it) => it.action === "Squash" || it.action === "Fixup").length;
  const droppedCount = items.filter((it) => it.action === "Drop").length;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Интерактивный rebase на ${shortenHash(baseRef)}`}
        confirmLabel={isStarting ? "Выполнение..." : "Начать rebase"}
        isDanger={hasPublishedCommits}
        onConfirm={handleStartRebase}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "680px",
            maxWidth: "90vw",
            maxHeight: "80vh",
          }}
        >
          {/* Warning for published commits per Section 10 & 11 */}
          {hasPublishedCommits && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "rgba(255, 107, 102, 0.15)",
                color: "var(--del)",
                fontSize: "var(--font-size-xs)",
                borderRadius: "var(--radius-base)",
                lineHeight: 1.4,
              }}
            >
              ⚠️ <b>Внимание:</b> цепочка содержит опубликованные на remote коммиты. Переписывание истории
              изменит их хеши и потребует <code>git push --force-with-lease</code>.
            </div>
          )}

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

          {/* Result preview */}
          <div
            style={{
              padding: "6px 10px",
              backgroundColor: "var(--bg3)",
              borderRadius: "var(--radius-base)",
              fontSize: "var(--font-size-xs)",
              color: "var(--tx)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              Исходных коммитов: <b>{items.length}</b>
            </span>
            <span>
              Итоговых коммитов: <b>{activeCount}</b>
              {squashedCount > 0 && <span style={{ color: "var(--pur)" }}> ({squashedCount} объединены)</span>}
              {droppedCount > 0 && <span style={{ color: "var(--del)" }}> ({droppedCount} удалены)</span>}
            </span>
          </div>

          {/* Commit List with Reorder and Actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "360px",
              overflowY: "auto",
              backgroundColor: "var(--bg)",
              padding: "4px",
              borderRadius: "var(--radius-base)",
              border: "1px solid var(--line)",
            }}
          >
            {isLoading ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
                Загрузка коммитов...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
                Нет коммитов для rebase между {shortenHash(baseRef)} и HEAD
              </div>
            ) : (
              items.map((item, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === items.length - 1;
                const isDropped = item.action === "Drop";
                const isSquashed = item.action === "Squash" || item.action === "Fixup";

                return (
                  <div
                    key={item.hash}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      backgroundColor: isDropped
                        ? "rgba(255, 107, 102, 0.08)"
                        : isSquashed
                        ? "rgba(195, 155, 255, 0.08)"
                        : "var(--bg2)",
                      borderRadius: "var(--radius-base)",
                      border: "1px solid var(--line)",
                      opacity: isDropped ? 0.6 : 1,
                    }}
                  >
                    {/* Reorder Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <button
                        disabled={isFirst}
                        onClick={() => moveItem(idx, -1)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: isFirst ? "default" : "pointer",
                          color: isFirst ? "var(--line)" : "var(--tx)",
                          padding: 0,
                          fontSize: "10px",
                          lineHeight: 1,
                        }}
                        title="Поднять выше (применится раньше)"
                      >
                        ▲
                      </button>
                      <button
                        disabled={isLast}
                        onClick={() => moveItem(idx, 1)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: isLast ? "default" : "pointer",
                          color: isLast ? "var(--line)" : "var(--tx)",
                          padding: 0,
                          fontSize: "10px",
                          lineHeight: 1,
                        }}
                        title="Опустить ниже (применится позже)"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Action Selector */}
                    <select
                      value={item.action}
                      onChange={(e) => handleActionChange(idx, e.target.value as RebaseActionKind)}
                      style={{
                        backgroundColor: "var(--bg3)",
                        color: "var(--tx)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--radius-base)",
                        fontSize: "11px",
                        padding: "3px 6px",
                        fontWeight: 600,
                      }}
                    >
                      <option value="Pick">pick</option>
                      <option value="Reword">reword</option>
                      <option value="Squash">squash</option>
                      <option value="Fixup">fixup</option>
                      <option value="Drop">drop</option>
                    </select>

                    {/* Hash */}
                    <span className="mono" style={{ fontSize: "11px", color: "var(--acc)", width: "54px" }}>
                      {item.short_hash}
                    </span>

                    {/* Subject / Message */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          color: isDropped ? "var(--mut)" : "var(--tx)",
                          textDecoration: isDropped ? "line-through" : "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.subject}
                      >
                        {item.subject}
                      </span>
                      {item.reword_message && item.action === "Reword" && (
                        <span style={{ fontSize: "11px", color: "var(--add)", fontStyle: "italic" }}>
                          → {item.reword_message}
                        </span>
                      )}
                    </div>

                    {/* Published Chip */}
                    {item.is_published && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--mut)",
                          backgroundColor: "var(--bg3)",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                        }}
                        title="Коммит присутствует на удалённом сервере"
                      >
                        remote
                      </span>
                    )}

                    {/* Reword Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openReword(idx)}
                      style={{ padding: "2px 6px", fontSize: "11px" }}
                      title="Изменить сообщение коммита"
                    >
                      {item.action === "Reword" ? "Текст..." : "✎"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Reword Commit Message Modal */}
      <Modal
        isOpen={rewordIndex !== null}
        onClose={() => setRewordIndex(null)}
        title="Изменить сообщение коммита (reword)"
        confirmLabel="Сохранить"
        onConfirm={saveReword}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "460px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--mut)" }}>
            Введите новое сообщение коммита:
          </p>
          <Textarea
            value={rewordText}
            onChange={(e) => setRewordText(e.target.value)}
            rows={4}
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
};
