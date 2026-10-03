# Механизм автоматического обновления Lode

В соответствии с требованиями Этапа 9 (`CLAUDE.md`), в **Lode** заложена архитектура автоматического обновления на базе **`tauri-plugin-updater`**.

---

## 1. Выбранный механизм: Безопасные криптографические обновления через манифест

Для десктопного Git-клиента критически важна безопасность: приложение исполняет системные процессы и имеет доступ к рабочим каталогам пользователя. Любая уязвимость в механизме обновлений может привести к исполнению недоверенного кода.

Поэтому выбран встроенный криптографический механизм Tauri Updater со следующими свойствами:

1. **Асимметричная подпись ED25519:**
   - Каждый релизный бинарник подписывается приватным ключом разработчика (хранится в секретах GitHub Actions: `TAURI_SIGNING_PRIVATE_KEY`).
   - Публичный ключ (`pubkey`) зашивается в `tauri.conf.json` приложения при компиляции.
   - Клиент отклоняет любые обновления, если цифровая подпись манифеста или файла архива не совпадает с публичным ключом.

2. **Статический JSON-манифест релиза (`latest.json`):**
   - Размещается на защищённом CDN / GitHub Releases (например, `https://github.com/danil/lode/releases/latest/download/latest.json`).
   - Манифест содержит версию, дату релиза, заметки к выпуску, SHA-256 хеш и сигнатуры для каждой поддерживаемой платформы:
     - `windows-x86_64` (`.msi.zip` / `.nsis.zip`)
     - `darwin-universal` / `darwin-aarch64` / `darwin-x86_64` (`.tar.gz`)
     - `linux-x86_64` (`.AppImage.tar.gz`)

3. **Атомарная установка без риска повреждения файлов:**
   - Обновление скачивается во временный каталог кэша приложения.
   - Проверяется контрольная сумма и цифровая подпись.
   - Замена исполняемого файла происходит атомарно:
     - На **Windows**: через отложенное переименование при перезапуске (замена блокированных файлов);
     - На **macOS / Linux**: через атомарный `rename(2)` бандла приложения.

---

## 2. Формат манифеста `latest.json`

```json
{
  "version": "v0.1.1",
  "notes": "Улучшена производительность графа истории и добавлена поддержка новых тем оформления.",
  "pub_date": "2025-03-01T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZQpS...",
      "url": "https://github.com/danil/lode/releases/download/v0.1.1/Lode_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZQpS...",
      "url": "https://github.com/danil/lode/releases/download/v0.1.1/Lode_x64.app.tar.gz"
    },
    "linux-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZQpS...",
      "url": "https://github.com/danil/lode/releases/download/v0.1.1/Lode_amd64.AppImage.tar.gz"
    },
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZQpS...",
      "url": "https://github.com/danil/lode/releases/download/v0.1.1/Lode_x64_en-US.msi.zip"
    }
  }
}
```

---

## 3. Генерация ключей и процесс сборки

1. **Генерация пары ключей:**
   ```bash
   npx @tauri-apps/cli signer generate -w ~/.tauri/lode.key
   ```
2. **Конфигурация в `tauri.conf.json`:**
   ```json
   "plugins": {
     "updater": {
       "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXkKUldUUW...",
       "endpoints": [
         "https://github.com/danil/lode/releases/latest/download/latest.json"
       ]
     }
   }
   ```
3. **Автоматическая сборка в GitHub Actions:**
   Workflow `.github/workflows/release.yml` автоматически собирает все дистрибутивы, подписывает их через приватный ключ из GitHub Secrets и публикует готовый релиз с `latest.json`.
