import React, { useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { StateBanner } from "./StateBanner";
import { Splitter, EmptyState } from "@/ui";
import { ChangesView } from "@/features/changes/ChangesView";
import { HistoryView } from "@/features/history/HistoryView";
import { useUiStore } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { listenToRepoChanged } from "@/api/client";
import { t } from "@/lib/i18n";

export const MainLayout: React.FC = () => {
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);

  const currentRepo = useRepoStore((s) => s.currentRepo);
  const loadStatus = useStatusStore((s) => s.loadStatus);

  // Load status and listen to repo:changed events from backend file watcher
  useEffect(() => {
    if (!currentRepo) return;

    loadStatus(currentRepo.path);

    let unlistenFn: (() => void) | undefined;
    listenToRepoChanged((_event) => {
      loadStatus(currentRepo.path);
    }).then((unlisten) => {
      unlistenFn = unlisten;
    }).catch(console.error);

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [currentRepo, loadStatus]);

  // Keyboard navigation: Ctrl/Cmd+1/2/3
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
      <StateBanner />

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
          {activeView === "chg" && <ChangesView />}

          {activeView === "hist" && <HistoryView />}

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
