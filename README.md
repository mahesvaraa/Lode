# Lode

**Lode** — минималистичный, быстрый десктопный Git-клиент для Windows, macOS и Linux на стеке **Tauri 2 + Rust + React 18 + TypeScript + Vite**.

---

## Что умеет (Этап 4: Ветки, теги, merge)

1. **Парсер ссылок (`src-tauri/src/git/parse/refs.rs`)**:
   - Парсинг `git for-each-ref` для локальных веток (`refs/heads/*`), удалённых (`refs/remotes/*`) и тегов (`refs/tags/*`).
   - Извлечение данных: имя, полный ref, хеш целевого коммита (с разыменованием аннотированных тегов), upstream-ветка, опережение/отставание (`↑ahead ↓behind`), признак `HEAD`, unix-время создания.
   - Корректная обработка слэшей, юникода и точек в именах веток без разделения по слэшу.

2. **Определение состояния репозитория и баннер (`src-tauri/src/git/state.rs`, `src/features/layout/StateBanner.tsx`)**:
   - Определение состояния строго по файлам в `.git` через `git rev-parse --git-path`:
     - `MERGE_HEAD` → слияние (`Merge`).
     - `rebase-merge/` или `rebase-apply/` → перебазирование (`Rebase`) с индикатором «шаг X из Y», целевым коммитом `onto` и веткой `head-name`.
     - `CHERRY_PICK_HEAD` → перенос коммита (`CherryPick`).
     - `REVERT_HEAD` → откат коммита (`Revert`).
     - `BISECT_LOG` → бисекция (`Bisect`).
   - Верхний `StateBanner`, который невозможно скрыть, пока активно незавершённое состояние.
   - Кнопки быстрого перехода к конфликтам и безопасной отмены (`--abort`).

3. **Управление ветками, тегами и merge (`src-tauri/src/commands/branch.rs`, `src/features/layout/Sidebar.tsx`)**:
   - Создание веток с валидацией имени через `git check-ref-format --branch <name>`.
   - Переключение веток (`switch_branch`) в один клик.
   - Переименование веток (`rename_branch`).
   - Удаление веток с подтверждением (`delete_branch`, поддержка флага `-D`).
   - Создание легковесных и аннотированных тегов с сообщениями (`create_tag`).
   - Удаление тегов с подтверждением (`delete_tag`).
   - Слияние веток (`merge_branch`): при возникновении конфликтов приложение фиксирует состояние `Merge`, выводит `u`-записи конфликтов в статус и отображает баннер; по кнопке «Отменить слияние» возвращает рабочую копию в исходное чистое состояние.

4. **История коммитов и граф веток (Этап 3)**:
   - Парсинг `git log -z`, чистый алгоритм lanes в `src/lib/graph.ts` (octopus-слияния, палитра из 8 цветов).
   - Виртуализированный рендеринг `@tanstack/react-virtual`, пагинация по 500 коммитов без разрывов линий.
   - Поиск по автору/теме/хешу, детали коммита и просмотр diff файлов.

5. **Индексация и коммиты (Этап 2)**:
   - Staging/unstaging/discard файлов, фрагментов (hunk) и строк по разделу 7.1.
   - Коммиты и amend через stdin (`-F -`), валидация темы до 72 символов.

6. **Статус, diff и файловый вотчер (Этап 1)**:
   - Porcelain v2 статус, режимы diff Inline / Side-by-side, вотчер с дебаунсом 200 мс.

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
# Проверка типов TypeScript (строго без ошибок)
npm run typecheck

# Модульные тесты фронтенда (Vitest: граф, сторы)
npm test

# Сборка веб-части
npm run build

# Все тесты Rust (парсеры, построение патчей, интеграционные тесты Stage 1, Stage 2, Stage 3, Stage 4)
cargo test --manifest-path src-tauri/Cargo.toml

# Линтер Rust (строго без предупреждений)
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## Известные ограничения (намеренно не сделано в Этапе 4)

- Remote-операции (fetch, pull, push) — **Этап 5**.
- Трёхпанельный редактор разрешения конфликтов — **Этап 6**.
- Stash, cherry-pick, revert, reset, blame — **Этап 7**.
- Интерактивный rebase — **Этап 8**.
