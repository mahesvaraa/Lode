import React, { useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { StateBanner } from "./StateBanner";
import { StatusBar } from "./StatusBar";
import { GlobalContextMenu } from "@/features/contextMenu/GlobalContextMenu";
import { ChangesView } from "@/features/changes/ChangesView";
import { HistoryView } from "@/features/history/HistoryView";
import { ConflictsView } from "@/features/conflicts/ConflictsView";
import { useUiStore } from "@/store/uiStore";
import { useRepoStore } from "@/store/repoStore";
import { useStatusStore } from "@/store/statusStore";
import { useRefsStore } from "@/store/refsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useToastStore } from "@/store/toastStore";
import { useOperationStore } from "@/store/operationStore";
import { Splitter } from "@/ui";
import { listenToRepoChanged, stageAll } from "@/api/client";

export const MainLayout: React.FC = () => {
  const activeView = useUiStore((s) => s.activeView);
  const setActiveView = useUiStore((s) => s.setActiveView);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);

  const currentRepo = useRepoStore((s) => s.currentRepo);
  const chooseAndOpenRepo = useRepoStore((s) => s.chooseAndOpenRepo);
  const loadStatus = useStatusStore((s) => s.loadStatus);
  const loadRefs = useRefsStore((s) => s.loadRefs);
  const loadRepoState = useRefsStore((s) => s.loadRepoState);
  const loadHistory = useHistoryStore((s) => s.loadInitial);
  const showToast = useToastStore((s) => s.showToast);

  const refreshAll = async () => {
    if (!currentRepo) return;
    await Promise.all([
      loadStatus(currentRepo.path),
      loadRepoState(currentRepo.path),
      loadRefs(currentRepo.path),
      loadHistory(currentRepo.path),
    ]);
    showToast("Репозиторий обновлён");
  };

  // Load status and listen to repo:changed events from backend file watcher
  useEffect(() => {
    if (!currentRepo) return;

    loadStatus(currentRepo.path);
    loadRepoState(currentRepo.path);

    let unlistenFn: (() => void) | undefined;
    listenToRepoChanged((event) => {
      loadStatus(currentRepo.path);
      loadRepoState(currentRepo.path);
      if (event.scopes.includes("refs")) {
        loadRefs(currentRepo.path);
      }
      if (event.scopes.includes("history")) {
        loadHistory(currentRepo.path);
      }
    })
      .then((unlisten) => {
        unlistenFn = unlisten;
      })
      .catch(console.error);

    // Window Focus Sync: auto-refresh when user switches back to Lode
    const onWindowFocus = () => {
      if (!currentRepo || useOperationStore.getState().activeOperation) return;
      loadStatus(currentRepo.path);
      loadRepoState(currentRepo.path);
      loadRefs(currentRepo.path);
      if (useUiStore.getState().activeView === "hist") {
        loadHistory(currentRepo.path);
      }
    };
    window.addEventListener("focus", onWindowFocus);

    // Periodic Background Sync: keep status updated every 5 seconds
    const intervalTimer = setInterval(() => {
      if (!currentRepo || useOperationStore.getState().activeOperation) return;
      loadStatus(currentRepo.path);
      loadRepoState(currentRepo.path);
    }, 5000);

    return () => {
      if (unlistenFn) unlistenFn();
      window.removeEventListener("focus", onWindowFocus);
      clearInterval(intervalTimer);
    };
  }, [currentRepo, loadStatus, loadRepoState, loadRefs, loadHistory]);

  // Global Keyboard Shortcuts (Section 13 of CLAUDE.md)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.key === "F5") {
        e.preventDefault();
        await refreshAll();
        return;
      }

      if (isCmdOrCtrl) {
        const keyLower = e.key.toLowerCase();

        if (keyLower === "k") {
          e.preventDefault();
          setCommandPaletteOpen(true);
        } else if (keyLower === "o") {
          e.preventDefault();
          const opened = await chooseAndOpenRepo();
          if (opened) {
            showToast("Репозиторий открыт");
          }
        } else if (keyLower === ",") {
          e.preventDefault();
          setSettingsOpen(true);
        } else if (e.shiftKey && (keyLower === "a" || keyLower === "ф")) {
          e.preventDefault();
          if (currentRepo) {
            await stageAll(currentRepo.path);
            await loadStatus(currentRepo.path);
            showToast("Все файлы добавлены в индекс");
          }
        } else if (e.key === "1") {
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
  }, [
    currentRepo,
    chooseAndOpenRepo,
    loadStatus,
    setActiveView,
    setCommandPaletteOpen,
    setSettingsOpen,
    showToast,
  ]);

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

          {activeView === "conf" && <ConflictsView />}
        </main>
      </div>

      <StatusBar />
      <GlobalContextMenu />
    </div>
  );
};
