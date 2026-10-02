import React from "react";
import { Button, IconButton, Chip } from "@/ui";
import { t } from "@/lib/i18n";
import { useRepoStore } from "@/store/repoStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";

export const Header: React.FC = () => {
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);

  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const theme = useUiStore((s) => s.theme);
  const showToast = useToastStore((s) => s.showToast);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 12px",
        height: "var(--header-height)",
        backgroundColor: "var(--bg2)",
        borderBottom: "1px solid var(--line)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: "6px", marginRight: "8px" }}>
        <i
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "var(--bg3)",
            border: "1px solid var(--line)",
            display: "inline-block",
          }}
        />
        <i
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "var(--bg3)",
            border: "1px solid var(--line)",
            display: "inline-block",
          }}
        />
        <i
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "var(--bg3)",
            border: "1px solid var(--line)",
            display: "inline-block",
          }}
        />
      </div>

      <b style={{ fontWeight: 600 }}>lode</b>
      <span style={{ color: "var(--mut)" }}>/</span>
      <span>{currentRepo?.name}</span>

      {currentRepo?.current_branch && (
        <Chip variant="head">
          {currentRepo.current_branch}
        </Chip>
      )}

      <div style={{ flex: 1 }} />

      <Button
        size="sm"
        onClick={() => showToast("Fetch: синхронизация в следующих этапах")}
      >
        {t.header.fetch}
      </Button>

      <Button
        size="sm"
        onClick={() => showToast("Pull: синхронизация в следующих этапах")}
      >
        {t.header.pull}
      </Button>

      <Button
        size="sm"
        variant="primary"
        onClick={() => showToast("Push: синхронизация в следующих этапах")}
      >
        {t.header.push}
      </Button>

      <Button
        size="sm"
        variant="default"
        title="Палитра команд (Ctrl+K)"
        onClick={() => showToast("Палитра команд будет доступна в этапе 9")}
      >
        Ctrl K
      </Button>

      <IconButton
        size="sm"
        aria-label={t.header.themeToggle}
        title={`${t.header.themeToggle} (${theme})`}
        icon={<span>◐</span>}
        onClick={toggleTheme}
      />

      <Button
        size="sm"
        variant="ghost"
        title="Закрыть репозиторий"
        onClick={closeRepo}
      >
        Закрыть
      </Button>
    </header>
  );
};
