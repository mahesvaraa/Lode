import React, { useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Splitter, EmptyState } from "@/ui";
import { useUiStore } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { t } from "@/lib/i18n";

export const MainLayout: React.FC = () => {
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const currentRepo = useRepoStore((s) => s.currentRepo);

  // Keyboard navigation: Ctrl/Cmd+1/2/3, etc.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveView("hist");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveView("chg");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveView("conf");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveView]);

  const handleSidebarResize = (delta: number) => {
    const newWidth = Math.min(Math.max(160, sidebarWidth + delta), 400);
    setSidebarWidth(newWidth);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--bg)",
      }}
    >
      <Header />

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          position: "relative",
        }}
      >
        <Sidebar />

        <Splitter direction="horizontal" onResize={handleSidebarResize} />

        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            backgroundColor: "var(--bg)",
          }}
        >
          {activeView === "hist" && (
            <EmptyState
              title={t.sidebar.history}
              description={`Репозиторий ${currentRepo?.name} открыт. История коммитов и граф будут реализованы на Этапе 3.`}
            />
          )}

          {activeView === "chg" && (
            <EmptyState
              title={t.sidebar.changes}
              description="Рабочая копия чистая. Просмотр статуса и diff будет реализован на Этапе 1."
            />
          )}

          {activeView === "conf" && (
            <EmptyState
              title={t.sidebar.conflicts}
              description="Конфликтов нет. Трёхпанельный редактор разрешения конфликтов будет реализован на Этапе 6."
            />
          )}
        </main>
      </div>
    </div>
  );
};
