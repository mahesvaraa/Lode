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

export interface PaletteCommand {
  id: string;
  category: string;
  title: string;
  description?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  enabled?: boolean;
}

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

  const isStateActive = Boolean(repoState && repoState.kind !== "Normal");
  const hasRepo = Boolean(currentRepo);

  const commands: PaletteCommand[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav:history",
        category: "Навигация",
        title: "Перейти в Историю коммитов",
        shortcut: "Ctrl+1",
        action: () => setActiveView("hist"),
      },
      {
        id: "nav:changes",
        category: "Навигация",
        title: "Перейти в Изменения и Индекс",
        shortcut: "Ctrl+2",
        action: () => setActiveView("chg"),
      },
      {
        id: "nav:conflicts",
        category: "Навигация",
        title: "Перейти в Конфликты",
        shortcut: "Ctrl+3",
        action: () => setActiveView("conf"),
      },
      {
        id: "nav:open-repo",
        category: "Навигация",
        title: "Открыть другой репозиторий...",
        shortcut: "Ctrl+O",
        action: handlePickRepo,
      },
      {
        id: "nav:settings",
        category: "Навигация",
        title: "Открыть настройки...",
        shortcut: "Ctrl+,",
        action: onOpenSettings,
      },

      // Sync & Remote
      {
        id: "remote:fetch",
        category: "Синхронизация",
        title: "Получить изменения (Fetch all & prune)",
        action: async () => {
          if (currentRepo) await fetchAction(currentRepo.path);
        },
        enabled: hasRepo,
      },
      {
        id: "remote:pull",
        category: "Синхронизация",
        title: "Стянуть изменения (Pull)",
        action: async () => {
          if (currentRepo) await pullAction(currentRepo.path);
        },
        enabled: hasRepo,
      },
      {
        id: "remote:push",
        category: "Синхронизация",
        title: "Отправить изменения (Push)",
        action: async () => {
          if (currentRepo) await pushAction(currentRepo.path);
        },
        enabled: hasRepo,
      },
      {
        id: "remote:push-force",
        category: "Синхронизация",
        title: "Отправить с безопасной перезаписью (Push --force-with-lease)",
        action: async () => {
          if (currentRepo) await pushAction(currentRepo.path, undefined, undefined, false, true);
        },
        enabled: hasRepo,
      },
      {
        id: "remote:manage",
        category: "Синхронизация",
        title: "Управление удалёнными репозиториями (Remotes)...",
        action: onOpenRemotes,
        enabled: hasRepo,
      },

      // Branches & Tags
      {
        id: "branch:new",
        category: "Ветки и теги",
        title: "Создать новую ветку...",
        action: onOpenNewBranch,
        enabled: hasRepo,
      },
      {
        id: "tag:new",
        category: "Ветки и теги",
        title: "Создать новый тег...",
        action: onOpenNewTag,
        enabled: hasRepo,
      },

      // Staging & Commits
      {
        id: "stage:all",
        category: "Индекс и коммиты",
        title: "Добавить всё в индекс (Stage all)",
        shortcut: "Ctrl+Shift+A",
        action: handleStageAll,
        enabled: hasRepo,
      },
      {
        id: "unstage:all",
        category: "Индекс и коммиты",
        title: "Снять всё с индекса (Unstage all)",
        action: handleUnstageAll,
        enabled: hasRepo,
      },
      {
        id: "stash:open",
        category: "Индекс и коммиты",
        title: "Открыть управление Stash...",
        action: onOpenStash,
        enabled: hasRepo,
      },

      // Operation state
      {
        id: "state:continue",
        category: "Операция",
        title: `Продолжить ${repoState?.kind || "операцию"} (--continue)`,
        action: handleContinue,
        enabled: hasRepo && isStateActive,
      },
      {
        id: "state:abort",
        category: "Операция",
        title: `Отменить ${repoState?.kind || "операцию"} (--abort)`,
        action: handleAbort,
        enabled: hasRepo && isStateActive,
      },

      // Theme
      {
        id: "theme:dark",
        category: "Тема",
        title: "Переключить на тёмную тему",
        action: () => updateSettings({ theme: "dark" }),
      },
      {
        id: "theme:light",
        category: "Тема",
        title: "Переключить на светлую тему",
        action: () => updateSettings({ theme: "light" }),
      },
      {
        id: "theme:system",
        category: "Тема",
        title: "Переключить на системную тему",
        action: () => updateSettings({ theme: "system" }),
      },

      // General
      {
        id: "app:refresh",
        category: "Общие",
        title: "Обновить репозиторий",
        shortcut: "F5",
        action: refreshRepo,
        enabled: hasRepo,
      },
      {
        id: "app:check-git",
        category: "Общие",
        title: "Проверить версию Git",
        action: handleCheckGit,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentRepo, repoState, hasRepo, isStateActive]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commands.filter((cmd) => {
      if (cmd.enabled === false) return false;
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
      );
    });
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const runCommand = async (cmd: PaletteCommand) => {
    onClose();
    await cmd.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        runCommand(filtered[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "80px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "560px",
          maxWidth: "92vw",
          backgroundColor: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-base)",
          overflow: "hidden",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--line)",
            backgroundColor: "var(--bg2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "14px", color: "var(--mut)" }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Введите команду или действие..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--tx)",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "var(--mut)",
              backgroundColor: "var(--bg3)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            ESC для закрытия
          </span>
        </div>

        {/* Command list */}
        <div style={{ maxHeight: "360px", overflowY: "auto", padding: "6px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--mut)", fontSize: "12px" }}>
              Команды не найдены
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => runCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-base)",
                    backgroundColor: isSelected ? "var(--bg3)" : "transparent",
                    color: isSelected ? "var(--tx)" : "var(--tx)",
                    cursor: "pointer",
                    fontSize: "12px",
                    transition: "background-color 0.08s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--mut)",
                        backgroundColor: "var(--bg2)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {cmd.category}
                    </span>
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>{cmd.title}</span>
                  </div>

                  {cmd.shortcut && (
                    <span
                      className="mono"
                      style={{
                        fontSize: "11px",
                        color: "var(--acc)",
                        backgroundColor: "var(--bg)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {cmd.shortcut}
                    </span>
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
