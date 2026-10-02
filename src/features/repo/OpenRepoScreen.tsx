import React, { useState } from "react";
import { Button, Input, IconButton, Banner } from "@/ui";
import { t } from "@/lib/i18n";
import { useRepoStore } from "@/store/repoStore";
import { useUiStore } from "@/store/uiStore";

export const OpenRepoScreen: React.FC = () => {
  const chooseAndOpenRepo = useRepoStore((s) => s.chooseAndOpenRepo);
  const openRepository = useRepoStore((s) => s.openRepository);
  const recentRepos = useRepoStore((s) => s.recentRepos);
  const removeRecent = useRepoStore((s) => s.removeRecent);
  const isLoading = useRepoStore((s) => s.isLoadingRepo);
  const error = useRepoStore((s) => s.repoError);
  const clearError = useRepoStore((s) => s.clearError);

  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const theme = useUiStore((s) => s.theme);

  const [manualPath, setManualPath] = useState("");

  const handleManualOpen = async () => {
    if (!manualPath.trim()) return;
    await openRepository(manualPath.trim());
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Minimal Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 14px",
          height: "var(--header-height)",
          backgroundColor: "var(--bg2)",
          borderBottom: "1px solid var(--line)",
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
        <span style={{ color: "var(--mut)" }}>{t.openRepo.title}</span>
        <div style={{ flex: 1 }} />
        <IconButton
          aria-label={t.header.themeToggle}
          title={`${t.header.themeToggle} (${theme})`}
          icon={<span>◐</span>}
          onClick={toggleTheme}
        />
      </header>

      {/* Error banner if opening failed */}
      {error && (
        <Banner
          variant="danger"
          action={
            <Button size="sm" onClick={clearError}>
              {t.actions.close}
            </Button>
          }
        >
          <span>{error}</span>
        </Banner>
      )}

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          overflow: "auto",
        }}
      >
        <div
          style={{
            width: "min(560px, 94vw)",
            backgroundColor: "var(--bg2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Welcome Title */}
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--tx)",
              }}
            >
              {t.openRepo.title}
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "var(--font-size-base)",
                color: "var(--mut)",
              }}
            >
              {t.openRepo.subtitle}
            </p>
          </div>

          {/* Primary Action Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Button
              variant="primary"
              disabled={isLoading}
              onClick={() => chooseAndOpenRepo()}
              style={{
                padding: "10px 16px",
                fontSize: "var(--font-size-md)",
                fontWeight: 500,
              }}
            >
              {isLoading ? "Открытие…" : t.openRepo.chooseFolder}
            </Button>

            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <Input
                placeholder="Или введите путь к репозиторию…"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualOpen();
                }}
                disabled={isLoading}
              />
              <Button
                variant="default"
                disabled={isLoading || !manualPath.trim()}
                onClick={handleManualOpen}
              >
                {t.actions.open}
              </Button>
            </div>
          </div>

          {/* Recent Repositories */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--mut)",
              }}
            >
              {t.openRepo.recentTitle}
            </div>

            {recentRepos.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  backgroundColor: "var(--bg3)",
                  borderRadius: "var(--radius-base)",
                  color: "var(--mut)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {t.openRepo.noRecent}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-base)",
                  overflow: "hidden",
                }}
              >
                {recentRepos.map((repoPath) => {
                  const parts = repoPath.replace(/\\/g, "/").split("/");
                  const folderName = parts[parts.length - 1] || repoPath;

                  return (
                    <div
                      key={repoPath}
                      onClick={() => openRepository(repoPath)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        backgroundColor: "var(--bg3)",
                        borderBottom: "1px solid var(--line)",
                        cursor: "pointer",
                        gap: "10px",
                        transition: "background-color 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--sel)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg3)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <b
                          style={{
                            fontSize: "var(--font-size-base)",
                            color: "var(--tx)",
                          }}
                        >
                          {folderName}
                        </b>
                        <span
                          className="mono"
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--mut)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {repoPath}
                        </span>
                      </div>

                      <IconButton
                        aria-label="Удалить из недавних"
                        title="Удалить из недавних"
                        variant="ghost"
                        size="sm"
                        icon={<span>×</span>}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecent(repoPath);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
