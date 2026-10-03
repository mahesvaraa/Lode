import React, { useState } from "react";
import { Button, Checkbox, Input, Modal, Select } from "@/ui";
import { useSettingsStore } from "@/store/settingsStore";
import { checkGit } from "@/api/client";
import { useToastStore } from "@/store/toastStore";
import type { GitInfo } from "@/api/types/git_info";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "appearance" | "git" | "performance" | "hotkeys" | "about";

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettingsStore();
  const showToast = useToastStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [gitCheckInfo, setGitCheckInfo] = useState<GitInfo | null>(null);
  const [isCheckingGit, setIsCheckingGit] = useState(false);

  const handleCheckGit = async () => {
    setIsCheckingGit(true);
    try {
      const info = await checkGit();
      setGitCheckInfo(info);
      showToast(`Обнаружен Git v${info.version || "неизвестно"}`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Ошибка проверки Git", "error");
    } finally {
      setIsCheckingGit(false);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "appearance", label: "Внешний вид" },
    { id: "git", label: "Git и поведение" },
    { id: "performance", label: "Производительность" },
    { id: "hotkeys", label: "Горячие клавиши" },
    { id: "about", label: "О программе" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Настройки Lode"
      confirmLabel="Закрыть"
      onConfirm={onClose}
    >
      <div
        style={{
          display: "flex",
          width: "720px",
          maxWidth: "92vw",
          height: "460px",
          gap: "16px",
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            width: "160px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            borderRight: "1px solid var(--line)",
            paddingRight: "12px",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: activeTab === t.id ? 600 : 400,
                color: activeTab === t.id ? "var(--tx)" : "var(--mut)",
                backgroundColor: activeTab === t.id ? "var(--bg3)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-base)",
                cursor: "pointer",
                transition: "background-color 0.12s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Pane */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
          {/* 1. Appearance */}
          {activeTab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Тема оформления
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["system", "dark", "light"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSettings({ theme: mode })}
                      style={{
                        padding: "6px 14px",
                        fontSize: "12px",
                        borderRadius: "var(--radius-base)",
                        border: "1px solid var(--line)",
                        backgroundColor: settings.theme === mode ? "var(--acc)" : "var(--bg2)",
                        color: settings.theme === mode ? "#ffffff" : "var(--tx)",
                        cursor: "pointer",
                      }}
                    >
                      {mode === "system" ? "Системная" : mode === "dark" ? "Тёмная" : "Светлая"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Размер шрифта интерфейса: {settings.font_size} px
                </label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {[11, 12, 13, 14, 16].map((size) => (
                    <Button
                      key={size}
                      size="sm"
                      variant={settings.font_size === size ? "primary" : "ghost"}
                      onClick={() => updateSettings({ font_size: size })}
                    >
                      {size} px
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Шрифт интерфейса
                </label>
                <Select
                  value={settings.font_family}
                  onChange={(e) => updateSettings({ font_family: e.target.value })}
                  options={[
                    { value: "Geist, system-ui, sans-serif", label: "Geist (по умолчанию)" },
                    { value: "Inter, system-ui, sans-serif", label: "Inter" },
                    { value: "Segoe UI, system-ui, sans-serif", label: "Segoe UI" },
                    { value: "system-ui, sans-serif", label: "Системный шрифт ОС" },
                  ]}
                  style={{ width: "100%", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Моноширинный шрифт (код, diff, хеши)
                </label>
                <Select
                  value={settings.code_font_family}
                  onChange={(e) => updateSettings({ code_font_family: e.target.value })}
                  options={[
                    { value: "Geist Mono, ui-monospace, monospace", label: "Geist Mono (по умолчанию)" },
                    { value: "JetBrains Mono, ui-monospace, monospace", label: "JetBrains Mono" },
                    { value: "Fira Code, ui-monospace, monospace", label: "Fira Code" },
                    { value: "Consolas, ui-monospace, monospace", label: "Consolas" },
                    { value: "ui-monospace, monospace", label: "Системный моноширинный" },
                  ]}
                  style={{ width: "100%", fontSize: "12px" }}
                />
              </div>
            </div>
          )}

          {/* 2. Git & Behavior */}
          {activeTab === "git" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Режим Pull по умолчанию
                </label>
                <Select
                  value={settings.pull_mode}
                  onChange={(e) => updateSettings({ pull_mode: e.target.value })}
                  options={[
                    { value: "ff-only", label: "Быстрая перемотка только (--ff-only, безопасно)" },
                    { value: "merge", label: "Создавать слияние (--merge)" },
                    { value: "rebase", label: "Перебазировать (--rebase)" },
                  ]}
                  style={{ width: "100%", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Путь к исполняемому файлу Git
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Input
                    placeholder="Автоопределение из PATH / C:\Program Files\Git"
                    value={settings.git_path || ""}
                    onChange={(e) => updateSettings({ git_path: e.target.value.trim() || null })}
                    style={{ flex: 1, fontSize: "12px" }}
                  />
                  <Button size="sm" variant="ghost" disabled={isCheckingGit} onClick={handleCheckGit}>
                    {isCheckingGit ? "Проверка..." : "Проверить"}
                  </Button>
                </div>
                {gitCheckInfo && (
                  <div style={{ fontSize: "11px", color: "var(--add)", marginTop: "4px" }}>
                    ✓ Git v{gitCheckInfo.version || "неизвестно"} ({gitCheckInfo.path || "PATH"})
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Внешний редактор
                </label>
                <Select
                  value={settings.external_editor || "none"}
                  onChange={(e) =>
                    updateSettings({
                      external_editor: e.target.value === "none" ? null : e.target.value,
                    })
                  }
                  options={[
                    { value: "none", label: "Не задан" },
                    { value: "code", label: "Visual Studio Code (code)" },
                    { value: "cursor", label: "Cursor (cursor)" },
                    { value: "subl", label: "Sublime Text (subl)" },
                    { value: "notepad++", label: "Notepad++ (notepad++)" },
                  ]}
                  style={{ width: "100%", fontSize: "12px" }}
                />
              </div>
            </div>
          )}

          {/* 3. Performance */}
          {activeTab === "performance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "12px", color: "var(--mut)", lineHeight: 1.4 }}>
                Опции оптимизации производительности для репозиториев на 50 000+ файлов (раздел 14 CLAUDE.md).
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "var(--bg3)",
                  borderRadius: "var(--radius-base)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <Checkbox
                    checked={settings.enable_fsmonitor}
                    onChange={(e) => updateSettings({ enable_fsmonitor: e.target.checked })}
                  />
                  <b style={{ fontSize: "12px" }}>Включить core.fsmonitor</b>
                </label>
                <div style={{ fontSize: "11px", color: "var(--mut)", paddingLeft: "24px" }}>
                  Использует системный демон файловых событий для ускорения проверки статуса гигантских репозиториев.
                </div>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "var(--bg3)",
                  borderRadius: "var(--radius-base)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <Checkbox
                    checked={settings.enable_untracked_cache}
                    onChange={(e) => updateSettings({ enable_untracked_cache: e.target.checked })}
                  />
                  <b style={{ fontSize: "12px" }}>Включить core.untrackedCache</b>
                </label>
                <div style={{ fontSize: "11px", color: "var(--mut)", paddingLeft: "24px" }}>
                  Кэширует список неотслеживаемых файлов для ускорения повторного вызова git status.
                </div>
              </div>
            </div>
          )}

          {/* 4. Hotkeys */}
          {activeTab === "hotkeys" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "12px", color: "var(--mut)", marginBottom: "4px" }}>
                Все основные действия Lode доступны с клавиатуры (раздел 13 CLAUDE.md):
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "6px 16px",
                  fontSize: "12px",
                  backgroundColor: "var(--bg2)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-base)",
                  border: "1px solid var(--line)",
                }}
              >
                <span>Палитра команд</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+K / Cmd+K</span>

                <span>Открыть репозиторий</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+O / Cmd+O</span>

                <span>Вкладка «История»</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+1</span>

                <span>Вкладка «Изменения»</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+2</span>

                <span>Вкладка «Конфликты»</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+3</span>

                <span>Настройки приложения</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+,</span>

                <span>Добавить всё в индекс</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+Shift+A</span>

                <span>Закоммитить изменения</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+Enter</span>

                <span>Обновить состояние</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>F5</span>

                <span>Предыдущий / следующий конфликт</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>[ / ]</span>

                <span>Навигация по спискам</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>J / K / ↑ / ↓</span>
              </div>
            </div>
          )}

          {/* 5. About */}
          {activeTab === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", paddingTop: "20px" }}>
              <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--tx)" }}>
                Lode
              </div>
              <div style={{ fontSize: "12px", color: "var(--acc)", fontWeight: 600 }}>
                Версия 0.1.0
              </div>
              <div style={{ fontSize: "12px", color: "var(--mut)", textAlign: "center", maxWidth: "400px", lineHeight: 1.5 }}>
                Минималистичный, быстрый десктопный Git-клиент на стеке Tauri 2 + Rust + React 18 + TypeScript + Vite.
              </div>
              <div
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  backgroundColor: "var(--bg3)",
                  borderRadius: "var(--radius-base)",
                  fontSize: "11px",
                  color: "var(--mut)",
                }}
              >
                Лицензия MIT • Сборка: Windows / macOS / Linux
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
