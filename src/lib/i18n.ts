import { create } from "zustand";

export type Locale = "ru" | "en";

export interface TranslationSchema {
  app: {
    name: string;
    tagline: string;
  };
  header: {
    fetch: string;
    pull: string;
    push: string;
    commandPalette: string;
    themeToggle: string;
  };
  sidebar: {
    history: string;
    changes: string;
    conflicts: string;
    branches: string;
    remotes: string;
    tags: string;
    stashes: string;
  };
  openRepo: {
    title: string;
    subtitle: string;
    chooseFolder: string;
    recentTitle: string;
    noRecent: string;
    dropHint: string;
    notARepo: string;
    invalidPath: string;
    initRepo: string;
    cloneRepo: string;
    initTitle: string;
    cloneTitle: string;
    repoUrl: string;
    targetFolder: string;
    initialBranch: string;
    cloneBtn: string;
    initBtn: string;
  };
  gitCheck: {
    notFoundTitle: string;
    notFoundDesc: string;
    versionTooOldTitle: string;
    specifyPath: string;
    manualPathPlaceholder: string;
    applyPath: string;
    checking: string;
    installInstructions: string;
  };
  actions: {
    open: string;
    cancel: string;
    confirm: string;
    close: string;
    retry: string;
    remove: string;
    copy: string;
    stageAll: string;
    commit: string;
    showGitOutput: string;
  };
  operations: {
    cancelling: string;
    cancelTooltip: string;
    cancelBtn: string;
  };
  theme: {
    system: string;
    dark: string;
    light: string;
  };
  diff: {
    inline: string;
    sideBySide: string;
    ignoreWhitespace: string;
    stageFile: string;
    unstageFile: string;
    discardFile: string;
    stageHunk: string;
    unstageHunk: string;
    discardHunk: string;
    binaryFile: string;
    binaryDesc: string;
    emptyOrClean: string;
    noNewline: string;
  };
  history: {
    searchPlaceholder: string;
    allBranches: string;
    currentBranch: string;
    commitsCount: string;
    commitActions: string;
    copySha: string;
    filesInCommit: string;
    parents: string;
    author: string;
    committer: string;
  };
  settings: {
    title: string;
    close: string;
    tabs: {
      appearance: string;
      git: string;
      performance: string;
      hotkeys: string;
      about: string;
    };
    appearance: string;
    theme: string;
    themeSystem: string;
    themeDark: string;
    themeLight: string;
    fontSize: string;
    fontFamily: string;
    codeFontFamily: string;
    language: string;
    gitAndTools: string;
    pullMode: string;
    pullModeFfOnly: string;
    pullModeMerge: string;
    pullModeRebase: string;
    gitPath: string;
    gitPathPlaceholder: string;
    checkBtn: string;
    checkingBtn: string;
    externalEditor: string;
    editorNone: string;
    performanceTitle: string;
    performanceDesc: string;
    fsmonitorTitle: string;
    fsmonitorDesc: string;
    untrackedCacheTitle: string;
    untrackedCacheDesc: string;
    hotkeysDesc: string;
    aboutDesc: string;
    aboutLicense: string;
  };
}

export const ruTranslations: TranslationSchema = {
  app: {
    name: "Lode",
    tagline: "Быстрый и лёгкий Git-клиент",
  },
  header: {
    fetch: "Получить",
    pull: "Стянуть",
    push: "Отправить",
    commandPalette: "Палитра команд",
    themeToggle: "Переключить тему",
  },
  sidebar: {
    history: "История",
    changes: "Изменения",
    conflicts: "Конфликты",
    branches: "Ветки",
    remotes: "Удалённые",
    tags: "Теги",
    stashes: "Stash",
  },
  openRepo: {
    title: "Откройте репозиторий",
    subtitle: "Выберите локальный Git-репозиторий для начала работы",
    chooseFolder: "Выбрать папку",
    recentTitle: "Недавние репозитории",
    noRecent: "Нет недавних репозиториев",
    dropHint: "Или перетащите папку сюда",
    notARepo: "Выбранная папка не является Git-репозиторием",
    invalidPath: "Указанный путь не существует",
    initRepo: "Создать новый",
    cloneRepo: "Клонировать",
    initTitle: "Инициализировать новый репозиторий",
    cloneTitle: "Клонировать удалённый репозиторий",
    repoUrl: "URL репозитория (HTTPS или SSH)",
    targetFolder: "Целевая папка",
    initialBranch: "Имя начальной ветки",
    cloneBtn: "Клонировать репозиторий",
    initBtn: "Инициализировать",
  },
  gitCheck: {
    notFoundTitle: "Git не найден",
    notFoundDesc:
      "Для работы Lode требуется установленный Git версии 2.30.0 или выше. Git не обнаружен в системных путях.",
    versionTooOldTitle: "Версия Git устарела",
    specifyPath: "Указать путь к Git",
    manualPathPlaceholder: "C:\\Program Files\\Git\\cmd\\git.exe или /usr/bin/git",
    applyPath: "Применить путь",
    checking: "Проверка наличия Git…",
    installInstructions:
      "Установите Git с официального сайта git-scm.com и перезапустите приложение.",
  },
  actions: {
    open: "Открыть",
    cancel: "Отмена",
    confirm: "Подтвердить",
    close: "Закрыть",
    retry: "Повторить",
    remove: "Удалить",
    copy: "Копировать",
    stageAll: "Добавить всё в индекс",
    commit: "Закоммитить",
    showGitOutput: "Показать вывод Git",
  },
  operations: {
    cancelling: "Прерывание команды…",
    cancelTooltip: "Прервать текущую операцию Git (kill process)",
    cancelBtn: "Отмена",
  },
  theme: {
    system: "Системная",
    dark: "Тёмная",
    light: "Светлая",
  },
  diff: {
    inline: "Строчный",
    sideBySide: "Side-by-side",
    ignoreWhitespace: "Игнорировать пробелы",
    stageFile: "В индекс",
    unstageFile: "Из индекса",
    discardFile: "Откатить",
    stageHunk: "Фрагмент в индекс",
    unstageHunk: "Исключить фрагмент",
    discardHunk: "Откатить фрагмент",
    binaryFile: "Бинарный файл",
    binaryDesc: "Различия в бинарных файлах не отображаются в текстовом редакторе.",
    emptyOrClean: "Файл пуст или без изменений",
    noNewline: "Нет финального перевода строки",
  },
  history: {
    searchPlaceholder: "Поиск по сообщению/автору/хешу…",
    allBranches: "Все ветки (--all)",
    currentBranch: "Текущая ветка",
    commitsCount: "коммитов",
    commitActions: "Действия ▾",
    copySha: "Копировать SHA",
    filesInCommit: "Файлы в коммите",
    parents: "Родители:",
    author: "Автор:",
    committer: "Коммитер:",
  },
  settings: {
    title: "Настройки Lode",
    close: "Закрыть",
    tabs: {
      appearance: "Внешний вид",
      git: "Git и поведение",
      performance: "Производительность",
      hotkeys: "Горячие клавиши",
      about: "О программе",
    },
    appearance: "Внешний вид",
    theme: "Тема оформления",
    themeSystem: "Системная",
    themeDark: "Тёмная",
    themeLight: "Светлая",
    fontSize: "Размер шрифта интерфейса",
    fontFamily: "Шрифт интерфейса",
    codeFontFamily: "Моноширинный шрифт (код, diff, хеши)",
    language: "Язык интерфейса",
    gitAndTools: "Git и утилиты",
    pullMode: "Режим Pull по умолчанию",
    pullModeFfOnly: "Быстрая перемотка только (--ff-only, безопасно)",
    pullModeMerge: "Создавать слияние (--merge)",
    pullModeRebase: "Перебазировать (--rebase)",
    gitPath: "Путь к исполняемому файлу Git",
    gitPathPlaceholder: "Автоопределение из PATH / C:\\Program Files\\Git",
    checkBtn: "Проверить",
    checkingBtn: "Проверка...",
    externalEditor: "Внешний редактор",
    editorNone: "Не задан",
    performanceTitle: "Оптимизация производительности",
    performanceDesc: "Опции для работы с огромными репозиториями на 50 000+ файлов (раздел 14 CLAUDE.md).",
    fsmonitorTitle: "Включить core.fsmonitor",
    fsmonitorDesc: "Использует системный демон файловых событий для мгновенной проверки статуса гигантских репозиториев.",
    untrackedCacheTitle: "Включить core.untrackedCache",
    untrackedCacheDesc: "Кэширует список неотслеживаемых файлов для ускорения повторного вызова git status.",
    hotkeysDesc: "Все основные действия Lode доступны с клавиатуры (раздел 13 CLAUDE.md):",
    aboutDesc: "Минималистичный, быстрый десктопный Git-клиент на стеке Tauri 2 + Rust + React 18 + TypeScript + Vite.",
    aboutLicense: "Лицензия MIT • Сборка: Windows / macOS / Linux",
  },
};

export const enTranslations: TranslationSchema = {
  app: {
    name: "Lode",
    tagline: "Fast & Lightweight Git Client",
  },
  header: {
    fetch: "Fetch",
    pull: "Pull",
    push: "Push",
    commandPalette: "Command Palette",
    themeToggle: "Toggle Theme",
  },
  sidebar: {
    history: "History",
    changes: "Changes",
    conflicts: "Conflicts",
    branches: "Branches",
    remotes: "Remotes",
    tags: "Tags",
    stashes: "Stash",
  },
  openRepo: {
    title: "Open a Repository",
    subtitle: "Select a local Git repository to start working",
    chooseFolder: "Choose Folder",
    recentTitle: "Recent Repositories",
    noRecent: "No recent repositories",
    dropHint: "Or drop a folder here",
    notARepo: "The selected folder is not a Git repository",
    invalidPath: "Specified path does not exist",
    initRepo: "Create New",
    cloneRepo: "Clone",
    initTitle: "Initialize New Repository",
    cloneTitle: "Clone Remote Repository",
    repoUrl: "Repository URL (HTTPS or SSH)",
    targetFolder: "Destination Folder",
    initialBranch: "Initial Branch Name",
    cloneBtn: "Clone Repository",
    initBtn: "Initialize",
  },
  gitCheck: {
    notFoundTitle: "Git Not Found",
    notFoundDesc:
      "Lode requires Git 2.30.0 or higher. Git was not found in your system path.",
    versionTooOldTitle: "Git Version Outdated",
    specifyPath: "Specify Git Path",
    manualPathPlaceholder: "C:\\Program Files\\Git\\cmd\\git.exe or /usr/bin/git",
    applyPath: "Apply Path",
    checking: "Checking Git installation…",
    installInstructions:
      "Install Git from the official website git-scm.com and restart the application.",
  },
  actions: {
    open: "Open",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    retry: "Retry",
    remove: "Delete",
    copy: "Copy",
    stageAll: "Stage All",
    commit: "Commit",
    showGitOutput: "Show Git Output",
  },
  operations: {
    cancelling: "Aborting command…",
    cancelTooltip: "Abort active Git operation (kill process)",
    cancelBtn: "Cancel",
  },
  theme: {
    system: "System",
    dark: "Dark",
    light: "Light",
  },
  diff: {
    inline: "Inline",
    sideBySide: "Side-by-side",
    ignoreWhitespace: "Ignore Whitespace",
    stageFile: "Stage File",
    unstageFile: "Unstage File",
    discardFile: "Discard",
    stageHunk: "Stage Hunk",
    unstageHunk: "Unstage Hunk",
    discardHunk: "Discard Hunk",
    binaryFile: "Binary File",
    binaryDesc: "Differences in binary files are not displayed in the text editor.",
    emptyOrClean: "File is empty or unchanged",
    noNewline: "No newline at end of file",
  },
  history: {
    searchPlaceholder: "Search message/author/hash…",
    allBranches: "All branches (--all)",
    currentBranch: "Current branch",
    commitsCount: "commits",
    commitActions: "Actions ▾",
    copySha: "Copy SHA",
    filesInCommit: "Files in commit",
    parents: "Parents:",
    author: "Author:",
    committer: "Committer:",
  },
  settings: {
    title: "Lode Settings",
    close: "Close",
    tabs: {
      appearance: "Appearance",
      git: "Git & Behavior",
      performance: "Performance",
      hotkeys: "Hotkeys",
      about: "About",
    },
    appearance: "Appearance",
    theme: "Theme",
    themeSystem: "System",
    themeDark: "Dark",
    themeLight: "Light",
    fontSize: "UI Font Size",
    fontFamily: "UI Font Family",
    codeFontFamily: "Monospace Font (code, diff, hashes)",
    language: "Interface Language",
    gitAndTools: "Git & Tools",
    pullMode: "Default Pull Mode",
    pullModeFfOnly: "Fast-forward only (--ff-only, safe)",
    pullModeMerge: "Create merge commit (--merge)",
    pullModeRebase: "Rebase on pull (--rebase)",
    gitPath: "Path to Git executable",
    gitPathPlaceholder: "Auto-detect from PATH / C:\\Program Files\\Git",
    checkBtn: "Check",
    checkingBtn: "Checking...",
    externalEditor: "External Editor",
    editorNone: "None",
    performanceTitle: "Performance Optimizations",
    performanceDesc: "Optimization options for large repositories with 50,000+ files (CLAUDE.md sec 14).",
    fsmonitorTitle: "Enable core.fsmonitor",
    fsmonitorDesc: "Uses the system file events daemon to speed up status checks on giant repositories.",
    untrackedCacheTitle: "Enable core.untrackedCache",
    untrackedCacheDesc: "Caches untracked files list to accelerate repeated git status checks.",
    hotkeysDesc: "All primary Lode actions are accessible via keyboard shortcuts (CLAUDE.md sec 13):",
    aboutDesc: "Minimalist, high-performance desktop Git client built with Tauri 2 + Rust + React 18 + TypeScript + Vite.",
    aboutLicense: "MIT License • Builds: Windows / macOS / Linux",
  },
};

const translations: Record<Locale, TranslationSchema> = {
  ru: ruTranslations,
  en: enTranslations,
};

interface I18nStore {
  locale: Locale;
  t: TranslationSchema;
  setLocale: (locale: Locale) => void;
}

const getSavedLocale = (): Locale => {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = localStorage.getItem("lode-locale") as Locale | null;
    if (saved === "ru" || saved === "en") return saved;
  }
  return "ru";
};

export const useI18n = create<I18nStore>((set) => ({
  locale: getSavedLocale(),
  t: translations[getSavedLocale()],
  setLocale: (locale: Locale) => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("lode-locale", locale);
    }
    set({ locale, t: translations[locale] });
  },
}));

// Backward compatibility static export for existing files
export const t = ruTranslations;
export type I18nKeys = TranslationSchema;
