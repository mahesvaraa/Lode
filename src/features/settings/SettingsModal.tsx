import React, { useState } from "react";
import { Button, Checkbox, Input, Modal, Select, CheckIcon, FolderIcon, CloseIcon } from "@/ui";
import { useSettingsStore } from "@/store/settingsStore";
import { useI18n } from "@/lib/i18n";
import { checkGit, pickFontFile } from "@/api/client";
import { useToastStore } from "@/store/toastStore";
import type { GitInfo } from "@/api/types/git_info";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "appearance" | "git" | "performance" | "hotkeys" | "about";

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSettingsStore();
  const { locale, setLocale, t: i18nText } = useI18n();
  const showToast = useToastStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [gitCheckInfo, setGitCheckInfo] = useState<GitInfo | null>(null);
  const [isCheckingGit, setIsCheckingGit] = useState(false);

  const handleCheckGit = async () => {
    setIsCheckingGit(true);
    try {
      const info = await checkGit();
      setGitCheckInfo(info);
      showToast(`Git v${info.version || "ok"}`);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      showToast(errObj.message || "Git check error", "error");
    } finally {
      setIsCheckingGit(false);
    }
  };

  const handlePickCustomFont = async () => {
    try {
      const path = await pickFontFile();
      if (path) {
        await updateSettings({ custom_font_path: path });
        showToast(`Шрифт интерфейса применён: ${path.split(/[\\/]/).pop()}`);
      }
    } catch (err: unknown) {
      console.error("Failed to pick font:", err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка загрузки шрифта: ${msg}`, "error");
    }
  };

  const handlePickCustomCodeFont = async () => {
    try {
      const path = await pickFontFile();
      if (path) {
        await updateSettings({ custom_code_font_path: path });
        showToast(`Шрифт кода применён: ${path.split(/[\\/]/).pop()}`);
      }
    } catch (err: unknown) {
      console.error("Failed to pick code font:", err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Ошибка загрузки шрифта кода: ${msg}`, "error");
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "appearance", label: i18nText.settings.tabs.appearance },
    { id: "git", label: i18nText.settings.tabs.git },
    { id: "performance", label: i18nText.settings.tabs.performance },
    { id: "hotkeys", label: i18nText.settings.tabs.hotkeys },
    { id: "about", label: i18nText.settings.tabs.about },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={i18nText.settings.title}
      confirmLabel={i18nText.settings.close}
      onConfirm={onClose}
      width="min(760px, 94vw)"
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          minHeight: "420px",
          maxHeight: "65vh",
          gap: "16px",
          overflow: "hidden",
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            width: "160px",
            flexShrink: 0,
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
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "6px" }}>
          {/* 1. Appearance */}
          {activeTab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  {i18nText.settings.language}
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => {
                      setLocale("ru");
                      showToast("Язык интерфейса: Русский");
                    }}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      borderRadius: "var(--radius-base)",
                      border: "1px solid var(--line)",
                      backgroundColor: locale === "ru" ? "var(--acc)" : "var(--bg2)",
                      color: locale === "ru" ? "#ffffff" : "var(--tx)",
                      cursor: "pointer",
                    }}
                  >
                    Русский
                  </button>
                  <button
                    onClick={() => {
                      setLocale("en");
                      showToast("Language changed: English");
                    }}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      borderRadius: "var(--radius-base)",
                      border: "1px solid var(--line)",
                      backgroundColor: locale === "en" ? "var(--acc)" : "var(--bg2)",
                      color: locale === "en" ? "#ffffff" : "var(--tx)",
                      cursor: "pointer",
                    }}
                  >
                    English
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  {i18nText.settings.theme}
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
                      {mode === "system"
                        ? i18nText.settings.themeSystem
                        : mode === "dark"
                        ? i18nText.settings.themeDark
                        : i18nText.settings.themeLight}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  {i18nText.settings.fontSize}: {settings.font_size} px
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>
                    {i18nText.settings.fontFamily} (Шрифт интерфейса)
                  </label>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handlePickCustomFont}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px" }}
                  >
                    <FolderIcon size={12} />
                    <span>Выбрать .ttf / .otf файл…</span>
                  </Button>
                </div>

                {settings.custom_font_path && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      backgroundColor: "var(--bg3)",
                      borderRadius: "var(--radius-base)",
                      border: "1px solid var(--acc)",
                      marginBottom: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      <span style={{ color: "var(--acc)", fontWeight: 600 }}>Файл:</span>
                      <span className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={settings.custom_font_path}>
                        {settings.custom_font_path.split(/[\\/]/).pop()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateSettings({ custom_font_path: null })}
                      title="Сбросить файл шрифта"
                      style={{ padding: "0 6px" }}
                    >
                      <CloseIcon size={12} />
                    </Button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {[
                    { label: "Inter", val: "Inter, sans-serif" },
                    { label: "Segoe UI", val: "Segoe UI, sans-serif" },
                    { label: "Roboto", val: "Roboto, sans-serif" },
                    { label: "Arial", val: "Arial, sans-serif" },
                    { label: "JetBrains", val: "JetBrains Mono, monospace" },
                    { label: "Системный", val: "system-ui, sans-serif" },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      size="sm"
                      variant={!settings.custom_font_path && settings.font_family.startsWith(preset.label) ? "primary" : "default"}
                      onClick={() => updateSettings({ font_family: preset.val, custom_font_path: null })}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <Input
                  value={settings.font_family}
                  onChange={(e) => updateSettings({ font_family: e.target.value, custom_font_path: null })}
                  placeholder="Имя системного шрифта (например: Roboto, Segoe UI, PT Sans...)"
                  style={{ width: "100%", fontSize: "12px", marginBottom: "6px" }}
                />

                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "12px",
                    padding: "6px 10px",
                    backgroundColor: "var(--bg3)",
                    borderRadius: "var(--radius-base)",
                    color: "var(--tx)",
                    border: "1px solid var(--line)",
                  }}
                >
                  Съешь же ещё этих мягких французских булок, да выпей чаю. The quick brown fox jumps over the lazy dog. 1234567890
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>
                    {i18nText.settings.codeFontFamily} (Моноширинный шрифт diff и кода)
                  </label>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handlePickCustomCodeFont}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px" }}
                  >
                    <FolderIcon size={12} />
                    <span>Выбрать .ttf / .otf файл…</span>
                  </Button>
                </div>

                {settings.custom_code_font_path && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      backgroundColor: "var(--bg3)",
                      borderRadius: "var(--radius-base)",
                      border: "1px solid var(--acc)",
                      marginBottom: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      <span style={{ color: "var(--acc)", fontWeight: 600 }}>Файл:</span>
                      <span className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={settings.custom_code_font_path}>
                        {settings.custom_code_font_path.split(/[\\/]/).pop()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateSettings({ custom_code_font_path: null })}
                      title="Сбросить файл шрифта кода"
                      style={{ padding: "0 6px" }}
                    >
                      <CloseIcon size={12} />
                    </Button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {[
                    { label: "Cascadia Code", val: "Cascadia Code, monospace" },
                    { label: "JetBrains Mono", val: "JetBrains Mono, monospace" },
                    { label: "Fira Code", val: "Fira Code, monospace" },
                    { label: "Consolas", val: "Consolas, monospace" },
                    { label: "Системный", val: "ui-monospace, monospace" },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      size="sm"
                      variant={!settings.custom_code_font_path && settings.code_font_family.startsWith(preset.label) ? "primary" : "default"}
                      onClick={() => updateSettings({ code_font_family: preset.val, custom_code_font_path: null })}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <Input
                  value={settings.code_font_family}
                  onChange={(e) => updateSettings({ code_font_family: e.target.value, custom_code_font_path: null })}
                  placeholder="Имя моноширинного шрифта (например: Consolas, Cascadia Code...)"
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
                  {i18nText.settings.pullMode}
                </label>
                <Select
                  value={settings.pull_mode}
                  onChange={(e) => updateSettings({ pull_mode: e.target.value })}
                  options={[
                    { value: "ff-only", label: i18nText.settings.pullModeFfOnly },
                    { value: "merge", label: i18nText.settings.pullModeMerge },
                    { value: "rebase", label: i18nText.settings.pullModeRebase },
                  ]}
                  style={{ width: "100%", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  {i18nText.settings.gitPath}
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Input
                    placeholder={i18nText.settings.gitPathPlaceholder}
                    value={settings.git_path || ""}
                    onChange={(e) => updateSettings({ git_path: e.target.value.trim() || null })}
                    style={{ flex: 1, fontSize: "12px" }}
                  />
                  <Button size="sm" variant="ghost" disabled={isCheckingGit} onClick={handleCheckGit}>
                    {isCheckingGit ? i18nText.settings.checkingBtn : i18nText.settings.checkBtn}
                  </Button>
                </div>
                {gitCheckInfo && (
                  <div style={{ fontSize: "11px", color: "var(--add)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckIcon size={12} style={{ color: "var(--add)" }} />
                    <span>Git v{gitCheckInfo.version || "ok"} ({gitCheckInfo.path || "PATH"})</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  {i18nText.settings.externalEditor}
                </label>
                <Select
                  value={settings.external_editor || "none"}
                  onChange={(e) =>
                    updateSettings({
                      external_editor: e.target.value === "none" ? null : e.target.value,
                    })
                  }
                  options={[
                    { value: "none", label: i18nText.settings.editorNone },
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
                {i18nText.settings.performanceDesc}
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
                  <b style={{ fontSize: "12px" }}>{i18nText.settings.fsmonitorTitle}</b>
                </label>
                <div style={{ fontSize: "11px", color: "var(--mut)", paddingLeft: "24px" }}>
                  {i18nText.settings.fsmonitorDesc}
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
                  <b style={{ fontSize: "12px" }}>{i18nText.settings.untrackedCacheTitle}</b>
                </label>
                <div style={{ fontSize: "11px", color: "var(--mut)", paddingLeft: "24px" }}>
                  {i18nText.settings.untrackedCacheDesc}
                </div>
              </div>
            </div>
          )}

          {/* 4. Hotkeys */}
          {activeTab === "hotkeys" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "12px", color: "var(--mut)", marginBottom: "4px" }}>
                {i18nText.settings.hotkeysDesc}
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
                <span>{locale === "ru" ? "Палитра команд" : "Command Palette"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+K / Cmd+K</span>

                <span>{locale === "ru" ? "Открыть репозиторий" : "Open Repository"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+O / Cmd+O</span>

                <span>{locale === "ru" ? "Вкладка «История»" : "History Tab"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+1</span>

                <span>{locale === "ru" ? "Вкладка «Изменения»" : "Changes Tab"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+2</span>

                <span>{locale === "ru" ? "Вкладка «Конфликты»" : "Conflicts Tab"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+3</span>

                <span>{locale === "ru" ? "Настройки приложения" : "Preferences"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+,</span>

                <span>{locale === "ru" ? "Добавить всё в индекс" : "Stage All"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+Shift+A</span>

                <span>{locale === "ru" ? "Закоммитить изменения" : "Commit"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>Ctrl+Enter</span>

                <span>{locale === "ru" ? "Обновить состояние" : "Refresh"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>F5</span>

                <span>{locale === "ru" ? "Предыдущий / следующий конфликт" : "Previous / Next Conflict"}</span>
                <span className="mono" style={{ color: "var(--acc)", fontWeight: 600 }}>[ / ]</span>

                <span>{locale === "ru" ? "Навигация по спискам" : "List Navigation"}</span>
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
                {locale === "ru" ? "Версия 0.1.0" : "Version 0.1.0"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--mut)", textAlign: "center", maxWidth: "420px", lineHeight: 1.5 }}>
                {i18nText.settings.aboutDesc}
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
                {i18nText.settings.aboutLicense}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
