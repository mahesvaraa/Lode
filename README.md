# Lode

**Lode** — минималистичный, быстрый десктопный Git-клиент для Windows, macOS и Linux на стеке **Tauri 2 + Rust + React 18 + TypeScript + Vite**.

---

## Что умеет (Этап 5: Remote)

1. **Синхронизация с удалёнными репозиториями (`Fetch`, `Pull`, `Push`)**:
   - `Fetch`: получение ссылок со всех remotes (`git fetch --all --prune`) с индикатором выполнения.
   - `Pull`: затягивание изменений в текущую ветку; режимы `ff-only` (по умолчанию по разделу 7 `CLAUDE.md`), `merge` и `rebase`.
   - `Push`: отправка коммитов в удалённую ветку (с флагом `-u` для первичной публикации ветки на remote).
   - Индикаторы `↑ahead` и `↓behind` в кнопках шапки и в сайдбаре рядом с именами веток.

2. **Защита данных и обработка отклонённого push (Acceptance Criteria)**:
   - Детекция отклонённого push (`PushRejected`) в парсере `from_git_stderr` с понятным сообщением: *«Отклонено сервером: удалённая ветка содержит коммиты, которых нет локально. Сначала выполните pull.»*.
   - Модальное окно при отклонённом push с предложением выполнить Pull или применить безопасный **Force Push (`--force-with-lease`)**.
   - По разделу 11: защита веток по умолчанию (`master`, `main`) — кнопка Force Push требует дополнительного подтверждения через чекбокс.

3. **Маскирование паролей и токенов в URL (`src-tauri/src/git/parse/remote.rs`)**:
   - Маскирование приватных данных в URL remotes для UI и логов (`https://user:pass@host/repo.git` → `https://***@host/repo.git`, `http://token@host/repo.git` → `http://***@host/repo.git`).
   - Приложение никогда не сохраняет и не логирует токены и пароли в чистом виде.

4. **Управление Remotes (`src/features/remote/RemoteModal.tsx`)**:
   - Просмотр всех настроенных remotes с маскированными fetch и push URL.
   - Добавление нового remote (`git remote add`).
   - Переименование remote (`git remote rename`).
   - Изменение URL (`git remote set-url`).
   - Удаление remote с подтверждением (`git remote remove`).

5. **Ветки, теги, merge и состояние репозитория (Этап 4)**:
   - Парсинг `git for-each-ref` для локальных/remote веток и тегов.
   - Определение состояний `Merge`, `Rebase` («шаг X из Y»), `CherryPick`, `Revert`, `Bisect` по файлам в `.git` через `git rev-parse --git-path`.
   - Верхний неустранимый `StateBanner` с кнопкой «Отменить слияние» (`--abort`).

6. **История коммитов и граф веток (Этап 3)**:
   - Парсинг `git log -z`, чистый алгоритм lanes в `src/lib/graph.ts` (octopus-слияния, палитра из 8 цветов).
   - Виртуализированный рендеринг `@tanstack/react-virtual`, пагинация по 500 коммитов без разрывов линий.

7. **Индексация и коммиты (Этап 2)**:
   - Staging/unstaging/discard файлов, фрагментов (hunk) и строк по разделу 7.1.
   - Коммиты и amend через stdin (`-F -`), валидация темы до 72 символов.

8. **Статус, diff и файловый вотчер (Этап 1)**:
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

# Модульные тесты фронтенда (Vitest: граф, сторы ui, status, refs, remote)
npm test

# Сборка веб-части
npm run build

# Все тесты Rust (парсеры, remote URL masking, построение патчей, интеграционные тесты Stage 1–5)
cargo test --manifest-path src-tauri/Cargo.toml

# Линтер Rust (строго без предупреждений)
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## Известные ограничения (намеренно не сделано в Этапе 5)

- Трёхпанельный редактор разрешения конфликтов — **Этап 6**.
- Stash, cherry-pick, revert, reset, blame — **Этап 7**.
- Интерактивный rebase — **Этап 8**.
- Палитра команд (Ctrl+K) и экран глобальных настроек — **Этап 9**.
