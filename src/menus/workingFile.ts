import type { MenuItem } from "@/store/contextMenuStore";
import type { RepoContext } from "./types";

export interface WorkingFileMenuCallbacks {
  onStageFile: (path: string) => void;
  onUnstageFile: (path: string) => void;
  onDiscardFile: (path: string, isUntracked: boolean) => void;
  onStashFileOnly: (path: string) => void;
  onViewHistory: (path: string) => void;
  onViewBlame: (path: string) => void;
  onAddToGitignore: (pattern: string) => void;
  onDeleteUntracked: (path: string) => void;
  onOpenConflictEditor: (path: string) => void;
  onTakeVersion: (path: string, version: "ours" | "theirs") => void;
  onMarkResolved: (path: string) => void;
  onOpenExternalEditor: (path: string) => void;
  onShowInFileManager: (path: string) => void;
  onStageMultiple?: (paths: string[]) => void;
  onUnstageMultiple?: (paths: string[]) => void;
  onDiscardMultiple?: (paths: string[]) => void;
  showToast: (msg: string, type?: "info" | "success" | "error") => void;
}

export function buildWorkingFileMenu(
  filePath: string,
  state: { isStaged: boolean; isUntracked: boolean; isConflicted: boolean },
  context: RepoContext,
  callbacks: WorkingFileMenuCallbacks
): MenuItem[] {
  const selectedPaths = context.selectedFilePaths || [filePath];
  const isMulti = selectedPaths.length > 1;

  // Multi-select menu
  if (isMulti) {
    return [
      {
        type: "header",
        label: `Выбрано файлов: ${selectedPaths.length}`,
      },
      {
        type: "item",
        id: "file:multi-stage",
        label: `Добавить в индекс (${selectedPaths.length})`,
        commandHint: `git add -- ... (${selectedPaths.length} files)`,
        run: () => {
          callbacks.onStageMultiple?.(selectedPaths);
        },
      },
      {
        type: "item",
        id: "file:multi-unstage",
        label: `Убрать из индекса (${selectedPaths.length})`,
        commandHint: `git restore --staged -- ... (${selectedPaths.length} files)`,
        run: () => {
          callbacks.onUnstageMultiple?.(selectedPaths);
        },
      },
      { type: "separator" },
      {
        type: "item",
        id: "file:multi-copy-paths",
        label: "Копировать относительные пути",
        run: async () => {
          await navigator.clipboard.writeText(selectedPaths.join("\n"));
          callbacks.showToast(`Скопировано ${selectedPaths.length} путей`);
        },
      },
      { type: "separator" },
      {
        type: "item",
        id: "file:multi-discard",
        label: `Сбросить изменения (${selectedPaths.length})…`,
        danger: true,
        commandHint: `git restore -- ... (${selectedPaths.length} files)`,
        run: () => {
          callbacks.onDiscardMultiple?.(selectedPaths);
        },
      },
    ];
  }

  // Single file menu
  const filename = filePath.split("/").pop() || filePath;
  const ext = filename.includes(".") ? `*.${filename.split(".").pop()}` : null;
  const dir = filePath.includes("/") ? `${filePath.split("/").slice(0, -1).join("/")}/` : null;

  const items: MenuItem[] = [];

  // Conflicted file
  if (state.isConflicted) {
    const isRebase =
      context.repoState?.kind === "Rebase" || context.repoState?.kind === "CherryPick";
    const leftLabel = isRebase
      ? "Основа (upstream / master)"
      : `Текущая (${context.currentBranch || "HEAD"})`;
    const rightLabel = isRebase
      ? "Ваш коммит"
      : "Вливаемая ветка";

    items.push(
      {
        type: "item",
        id: "file:open-conflicts",
        label: "Открыть в редакторе конфликтов",
        run: () => callbacks.onOpenConflictEditor(filePath),
      },
      {
        type: "item",
        id: "file:take-ours",
        label: `Взять версию: ${leftLabel}`,
        commandHint: `git checkout --ours -- ${filePath}`,
        run: () => callbacks.onTakeVersion(filePath, "ours"),
      },
      {
        type: "item",
        id: "file:take-theirs",
        label: `Взять версию: ${rightLabel}`,
        commandHint: `git checkout --theirs -- ${filePath}`,
        run: () => callbacks.onTakeVersion(filePath, "theirs"),
      },
      {
        type: "item",
        id: "file:mark-resolved",
        label: "Отметить файл решённым",
        commandHint: `git add -- ${filePath}`,
        run: () => callbacks.onMarkResolved(filePath),
      },
      { type: "separator" }
    );
  } else if (state.isStaged) {
    // Staged file
    items.push(
      {
        type: "item",
        id: "file:unstage",
        label: "Убрать из индекса",
        commandHint: `git restore --staged -- ${filePath}`,
        run: () => callbacks.onUnstageFile(filePath),
      },
      {
        type: "item",
        id: "file:history",
        label: "История файла…",
        commandHint: `git log --follow -- ${filePath}`,
        run: () => callbacks.onViewHistory(filePath),
      },
      {
        type: "item",
        id: "file:blame",
        label: "Blame (авторство строк)…",
        commandHint: `git blame --porcelain -- ${filePath}`,
        run: () => callbacks.onViewBlame(filePath),
      },
      { type: "separator" }
    );
  } else if (state.isUntracked) {
    // Untracked file
    items.push(
      {
        type: "item",
        id: "file:stage",
        label: "Добавить в индекс",
        commandHint: `git add -- ${filePath}`,
        run: () => callbacks.onStageFile(filePath),
      },
      {
        type: "item",
        id: "file:gitignore-submenu",
        label: "Добавить в .gitignore",
        children: [
          {
            type: "item",
            id: "file:gitignore-file",
            label: `Этот файл (${filePath})`,
            run: () => callbacks.onAddToGitignore(filePath),
          },
          ...(ext
            ? [
                {
                  type: "item" as const,
                  id: "file:gitignore-ext",
                  label: `По расширению (${ext})`,
                  run: () => callbacks.onAddToGitignore(ext),
                },
              ]
            : []),
          ...(dir
            ? [
                {
                  type: "item" as const,
                  id: "file:gitignore-dir",
                  label: `Всю папку (${dir})`,
                  run: () => callbacks.onAddToGitignore(dir),
                },
              ]
            : []),
        ],
      },
      {
        type: "item",
        id: "file:delete-untracked",
        label: "Удалить неотслеживаемый файл…",
        commandHint: `git clean -f -- ${filePath}`,
        danger: true,
        run: () => callbacks.onDeleteUntracked(filePath),
      },
      { type: "separator" }
    );
  } else {
    // Unstaged modified file
    items.push(
      {
        type: "item",
        id: "file:stage",
        label: "Добавить в индекс",
        commandHint: `git add -- ${filePath}`,
        run: () => callbacks.onStageFile(filePath),
      },
      {
        type: "item",
        id: "file:stash-only",
        label: "Добавить в stash только этот файл…",
        commandHint: `git stash push -m "stash ${filename}" -- ${filePath}`,
        run: () => callbacks.onStashFileOnly(filePath),
      },
      {
        type: "item",
        id: "file:history",
        label: "История файла…",
        commandHint: `git log --follow -- ${filePath}`,
        run: () => callbacks.onViewHistory(filePath),
      },
      {
        type: "item",
        id: "file:blame",
        label: "Blame (авторство строк)…",
        commandHint: `git blame --porcelain -- ${filePath}`,
        run: () => callbacks.onViewBlame(filePath),
      },
      {
        type: "item",
        id: "file:discard",
        label: "Сбросить изменения…",
        commandHint: `git restore -- ${filePath}`,
        danger: true,
        run: () => callbacks.onDiscardFile(filePath, false),
      },
      { type: "separator" }
    );
  }

  // Common file actions
  const isWindows = navigator.userAgent.includes("Windows");
  const isMac = navigator.userAgent.includes("Mac");
  const fileManagerLabel = isWindows
    ? "Показать в Проводнике"
    : isMac
    ? "Показать в Finder"
    : "Показать в файловом менеджере";

  items.push(
    {
      type: "item",
      id: "file:open-editor",
      label: "Открыть во внешнем редакторе",
      run: () => callbacks.onOpenExternalEditor(filePath),
    },
    {
      type: "item",
      id: "file:show-file-manager",
      label: fileManagerLabel,
      run: () => callbacks.onShowInFileManager(filePath),
    },
    {
      type: "item",
      id: "file:copy-submenu",
      label: "Копировать путь",
      children: [
        {
          type: "item",
          id: "file:copy-rel-path",
          label: "Относительный путь",
          run: async () => {
            await navigator.clipboard.writeText(filePath);
            callbacks.showToast(`Путь скопирован: ${filePath}`);
          },
        },
        {
          type: "item",
          id: "file:copy-abs-path",
          label: "Абсолютный путь",
          run: async () => {
            const abs = `${context.repoPath.replace(/[/\\]$/, "")}/${filePath}`;
            await navigator.clipboard.writeText(abs);
            callbacks.showToast(`Абсолютный путь скопирован`);
          },
        },
        {
          type: "item",
          id: "file:copy-name",
          label: "Имя файла",
          run: async () => {
            await navigator.clipboard.writeText(filename);
            callbacks.showToast(`Имя файла скопировано: ${filename}`);
          },
        },
      ],
    }
  );

  return items;
}
