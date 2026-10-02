export const t = {
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
} as const;

export type I18nKeys = typeof t;
