# Lode

**Lode** — минималистичный, быстрый десктопный Git-клиент для Windows, macOS и Linux на стеке **Tauri 2 + Rust + React 18 + TypeScript + Vite**.

---

## Что умеет (Этап 0: Каркас и дизайн-система)

1. **Архитектура Tauri 2 + Rust**:
   - Единый модуль запуска Git (`src-tauri/src/git/runner.rs`) со строгой изоляцией процессов, запретом шелла, таймаутами и флагом `CREATE_NO_WINDOW` на Windows.
   - Очередь записи (`src-tauri/src/git/queue.rs`) с мьютексом на репозиторий для предотвращения гонок за `index.lock`.
   - Проверка наличия Git и его версии (требуется >= 2.30.0). Автоматический поиск в `PATH` и стандартных директориях Windows/macOS/Linux.
   - Экран отсутствия Git (`GitMissingScreen`) с инструкцией по установке и возможностью вручную указать путь к бинарнику `git.exe` / `git`.
   - Экран «Откройте репозиторий» (`OpenRepoScreen`) с системным диалогом выбора папки, валидацией репозитория через `git rev-parse --show-toplevel` и списком недавних репозиториев (сохраняются в каталоге конфигурации приложения).
   - Единый тип ошибок `AppError` (`kind`, `message`, `details`) с автоматической трансляцией в TypeScript через `ts-rs`.

2. **Дизайн-система и интерфейс**:
   - Точное соответствие прототипу: 1px границы, отсутствие теней и градиентов, строгая цветовая палитра.
   - Поддержка тем: Светлая, Тёмная и Системная (выбор сохраняется).
   - Локально встроенные шрифты **Geist** и **Geist Mono** (работа без внешних запросов к сети).
   - Полная библиотека базовых UI-компонентов: `Button`, `IconButton`, `Chip`, `List`/`Row`, `Tabs`, `Input`, `Textarea`, `Select`, `Checkbox`, `Modal`, `ContextMenu`, `Tooltip`, `Toast`, `Banner`, `Skeleton`, `EmptyState`, `Splitter`.
   - Базовая раскладка: шапка с кнопками действий и переключателем тем, сайдбар с возможностью изменения ширины перетаскиванием сплиттера, горячие клавиши (`Ctrl/Cmd+1/2/3`).

3. **Качество и безопасность**:
   - Строгая CSP без `unsafe-eval`.
   - Минимальные capabilities в Tauri 2.
   - Тесты бэкенда (`cargo test`) и фронтенда (`vitest`).
   - Чистая компиляция без предупреждений (`cargo clippy -- -D warnings`, `tsc --noEmit`).
   - CI матрица GitHub Actions для Windows, macOS и Ubuntu.

---

## Требования к окружению

- **Git**: версия 2.30.0 или новее.
- **Node.js**: v18+ или v20+.
- **Rust**: stable toolchain (1.80+).
- **Платформенные зависимости**:
  - **Windows**: WebView2 (встроен в Windows 10/11).
  - **Linux (Ubuntu/Debian)**: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.
  - **macOS**: Xcode Command Line Tools.

---

## Как запустить

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск в режиме разработки
```bash
npm run tauri dev
```

### 3. Запуск только веб-интерфейса (Vite)
```bash
npm run dev
```

---

## Проверка и тестирование

```bash
# Проверка типов TypeScript
npm run typecheck

# Модульные тесты фронтенда (Vitest)
npm test

# Сборка веб-части
npm run build

# Тесты Rust (парсеры, runner, экспорт типов)
cargo test --manifest-path src-tauri/Cargo.toml

# Линтер Rust (без предупреждений)
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## Известные ограничения (намеренно не сделано в Этапе 0)

- Парсинг рабочего дерева и индекса (`status --porcelain=v2`) будет реализован на **Этапе 1**.
- Просмотр unified diff с подсветкой синтаксиса — **Этап 1**.
- Staging файлов, хунков и коммиты — **Этап 2**.
- Граф коммитов и виртуализированная история — **Этап 3**.
- Ветки, теги, merge и баннеры состояний — **Этап 4**.
- Remote-операции (fetch, pull, push) — **Этап 5**.
- Трёхпанельный редактор конфликтов — **Этап 6**.
