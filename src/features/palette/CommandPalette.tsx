import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useRemoteStore } from "@/store/remoteStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useToastStore } from "@/store/toastStore";
import { continueOperation, abortMerge, stageAll, unstageAll, checkGit } from "@/api/client";
import { buildPaletteCommands, type PaletteCommand } from "./paletteCommands";

export { type PaletteCommand };

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenStash: () => void;
  onOpenRemotes: () => void;
  onOpenNewBranch: () => void;
  onOpenNewTag: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenStash,
  onOpenRemotes,
  onOpenNewBranch,
  onOpenNewTag,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentRepo = useRepoStore((s) => s.currentRepo);
  const chooseAndOpenRepo = useRepoStore((s) => s.chooseAndOpenRepo);
  const repoState = useRefsStore((s) => s.repoState);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const showToast = useToastStore((s) => s.showToast);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadHistory = useHistoryStore((s) => s.loadInitial);
  const fetchAction = useRemoteStore((s) => s.fetch);
  const pullAction = useRemoteStore((s) => s.pull);
  const pushAction = useRemoteStore((s) => s.push);

  const refreshRepo = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadStatus(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadRefs(currentRepo.path),
      loadHistory(currentRepo.path),
    ]);
    showToast("Репозиторий обновлён");
  };

  const handlePickRepo = async () => {
    try {
      const opened = await chooseAndOpenRepo();
      if (opened) {
        showToast("Репозиторий успешно открыт");
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка открытия репозитория", "error");
    }
  };

  const handleContinue = async () => {
    if (!currentRepo) return;
    try {
      await continueOperation(currentRepo.path);
      await refreshRepo();
      showToast("Операция успешно продолжена");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка продолжения операции", "error");
    }
  };

  const handleAbort = async () => {
    if (!currentRepo) return;
    try {
      await abortMerge(currentRepo.path);
      await refreshRepo();
      showToast("Операция отменена");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка отмены операции", "error");
    }
  };

  const handleStageAll = async () => {
    if (!currentRepo) return;
    try {
      await stageAll(currentRepo.path);
      await loadStatus(currentRepo.path);
      showToast("Все файлы добавлены в индекс");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка добавления в индекс", "error");
    }
  };

  const handleUnstageAll = async () => {
    if (!currentRepo) return;
    try {
      await unstageAll(currentRepo.path);
      await loadStatus(currentRepo.path);
      showToast("Все файлы убраны из индекса");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка сброса индекса", "error");
    }
  };

  const handleCheckGit = async () => {
    try {
      const info = await checkGit();
      showToast(`Git v${info.version || "неизвестно"} (${info.path || "PATH"})`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка проверки Git", "error");
    }
  };

  const commands = useMemo(
    () =>
      buildPaletteCommands({
        hasRepo: Boolean(currentRepo),
        repoPath: currentRepo?.path,
        repoState,
        onNavigate: (view) => setActiveView(view),
        onPickRepo: handlePickRepo,
        onOpenSettings,
        onOpenRemotes,
        onOpenNewBranch,
        onOpenNewTag,
        onOpenStash,
        onFetch: async (path) => {
          await fetchAction(path);
        },
        onPull: async (path) => {
          await pullAction(path);
        },
        onPush: async (path, force) => {
          await pushAction(path, undefined, undefined, false, force);
        },
        onStageAll: handleStageAll,
        onUnstageAll: handleUnstageAll,
        onContinue: handleContinue,
        onAbort: handleAbort,
        onRefreshRepo: refreshRepo,
        onCheckGit: handleCheckGit,
        onUpdateSettings: (s) => updateSettings(s),
      }),
    [
      currentRepo,
      repoState,
      setActiveView,
      onOpenSettings,
      onOpenRemotes,
      onOpenNewBranch,
      onOpenNewTag,
      onOpenStash,
      fetchAction,
      pullAction,
      pushAction,
      updateSettings,
    ]
  );

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commands.filter((cmd) => {
      if (cmd.enabled === false) return false;
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        (cmd.description && cmd.description.toLowerCase().includes(q))
      );
    });
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = async (cmd: PaletteCommand) => {
    onClose();
    try {
      await cmd.action();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Команда завершилась с ошибкой", "error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
      return;
    }

    if (e.key === "Enter" && filteredCommands.length > 0) {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) {
        handleSelect(target);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "560px",
          maxWidth: "92vw",
          backgroundColor: "var(--bg2)",
          border: "1px solid var(--line)",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "14px", color: "var(--mut)" }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите команду или поиск..."
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              color: "var(--tx)",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          />
          <kbd
            style={{
              fontSize: "11px",
              backgroundColor: "var(--bg3)",
              color: "var(--mut)",
              border: "1px solid var(--line)",
              borderRadius: "4px",
              padding: "2px 6px",
            }}
          >
            Esc
          </kbd>
        </div>

        <div style={{ maxHeight: "380px", overflowY: "auto", padding: "6px" }}>
          {filteredCommands.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--mut)",
                fontSize: "13px",
              }}
            >
              Команды не найдены
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--sel)" : "transparent",
                    transition: "background-color 0.05s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--mut)",
                      backgroundColor: "var(--bg3)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      minWidth: "75px",
                      textAlign: "center",
                    }}
                  >
                    {cmd.category}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--tx)",
                        fontWeight: isSelected ? 500 : 400,
                      }}
                    >
                      {cmd.title}
                    </span>
                    {cmd.description && (
                      <span style={{ fontSize: "11px", color: "var(--mut)" }}>
                        {cmd.description}
                      </span>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <kbd
                      style={{
                        fontSize: "11px",
                        backgroundColor: "var(--bg3)",
                        color: "var(--mut)",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
