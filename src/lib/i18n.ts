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
    appearance: string;
    theme: string;
    fontSize: string;
    language: string;
    gitAndTools: string;
    pullMode: string;
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
    title: "Настройки",
    appearance: "Внешний вид",
    theme: "Тема оформления",
    fontSize: "Размер шрифта",
    language: "Язык интерфейса",
    gitAndTools: "Git и утилиты",
    pullMode: "Режим Pull по умолчанию",
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
    title: "Settings",
    appearance: "Appearance",
    theme: "Theme",
    fontSize: "Font size",
    language: "Language",
    gitAndTools: "Git & Tools",
    pullMode: "Default Pull Mode",
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
