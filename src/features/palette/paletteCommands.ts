import type { RepoState } from "@/api/types/repo_state";
import type { AppSettings } from "@/api/types/settings";

export interface PaletteCommand {
  id: string;
  category: string;
  title: string;
  description?: string;
  shortcut?: string;
  action: () => void | Promise<void>;
  enabled?: boolean;
}

export interface BuildPaletteCommandsParams {
  hasRepo: boolean;
  repoPath?: string;
  repoState: RepoState | null;
  onNavigate: (view: "hist" | "chg" | "conf") => void;
  onPickRepo: () => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenRemotes: () => void;
  onOpenNewBranch: () => void;
  onOpenNewTag: () => void;
  onOpenStash: () => void;
  onFetch: (path: string) => Promise<void>;
  onPull: (path: string) => Promise<void>;
  onPush: (path: string, force?: boolean) => Promise<void>;
  onStageAll: () => Promise<void>;
  onUnstageAll: () => Promise<void>;
  onContinue: () => Promise<void>;
  onAbort: () => Promise<void>;
  onRefreshRepo: () => Promise<void>;
  onCheckGit: () => Promise<void>;
  onUpdateSettings: (settings: Partial<AppSettings>) => void | Promise<void>;
}

export function buildPaletteCommands(
  params: BuildPaletteCommandsParams
): PaletteCommand[] {
  const {
    hasRepo,
    repoPath,
    repoState,
    onNavigate,
    onPickRepo,
    onOpenSettings,
    onOpenRemotes,
    onOpenNewBranch,
    onOpenNewTag,
    onOpenStash,
    onFetch,
    onPull,
    onPush,
    onStageAll,
    onUnstageAll,
    onContinue,
    onAbort,
    onRefreshRepo,
    onCheckGit,
    onUpdateSettings,
  } = params;

  const isStateActive = Boolean(repoState && repoState.kind !== "Normal");

  return [
    // Navigation
    {
      id: "nav:history",
      category: "Навигация",
      title: "Перейти в Историю коммитов",
      shortcut: "Ctrl+1",
      action: () => onNavigate("hist"),
    },
    {
      id: "nav:changes",
      category: "Навигация",
      title: "Перейти в Изменения и Индекс",
      shortcut: "Ctrl+2",
      action: () => onNavigate("chg"),
    },
    {
      id: "nav:conflicts",
      category: "Навигация",
      title: "Перейти в Конфликты",
      shortcut: "Ctrl+3",
      action: () => onNavigate("conf"),
    },
    {
      id: "nav:open-repo",
      category: "Навигация",
      title: "Открыть другой репозиторий...",
      shortcut: "Ctrl+O",
      action: onPickRepo,
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
        if (repoPath) await onFetch(repoPath);
      },
      enabled: hasRepo,
    },
    {
      id: "remote:pull",
      category: "Синхронизация",
      title: "Стянуть изменения (Pull)",
      action: async () => {
        if (repoPath) await onPull(repoPath);
      },
      enabled: hasRepo,
    },
    {
      id: "remote:push",
      category: "Синхронизация",
      title: "Отправить изменения (Push)",
      action: async () => {
        if (repoPath) await onPush(repoPath, false);
      },
      enabled: hasRepo,
    },
    {
      id: "remote:push-force",
      category: "Синхронизация",
      title: "Отправить с безопасной перезаписью (Push --force-with-lease)",
      action: async () => {
        if (repoPath) await onPush(repoPath, true);
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
      action: onStageAll,
      enabled: hasRepo,
    },
    {
      id: "unstage:all",
      category: "Индекс и коммиты",
      title: "Снять всё с индекса (Unstage all)",
      action: onUnstageAll,
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
      action: onContinue,
      enabled: hasRepo && isStateActive,
    },
    {
      id: "state:abort",
      category: "Операция",
      title: `Отменить ${repoState?.kind || "операцию"} (--abort)`,
      action: onAbort,
      enabled: hasRepo && isStateActive,
    },

    // Theme
    {
      id: "theme:dark",
      category: "Тема",
      title: "Переключить на тёмную тему",
      action: () => onUpdateSettings({ theme: "dark" }),
    },
    {
      id: "theme:light",
      category: "Тема",
      title: "Переключить на светлую тему",
      action: () => onUpdateSettings({ theme: "light" }),
    },
    {
      id: "theme:system",
      category: "Тема",
      title: "Переключить на системную тему",
      action: () => onUpdateSettings({ theme: "system" }),
    },

    // General
    {
      id: "app:refresh",
      category: "Общие",
      title: "Обновить репозиторий",
      shortcut: "F5",
      action: onRefreshRepo,
      enabled: hasRepo,
    },
    {
      id: "app:check-git",
      category: "Общие",
      title: "Проверить версию Git",
      action: onCheckGit,
    },
  ];
}
