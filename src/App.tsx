import React, { useEffect } from "react";
import { useRepoStore } from "@/store/repoStore";
import { useSettingsStore } from "@/store/settingsStore";
import { GitMissingScreen } from "@/features/gitCheck/GitMissingScreen";
import { OpenRepoScreen } from "@/features/repo/OpenRepoScreen";
import { MainLayout } from "@/features/layout/MainLayout";
import { ToastContainer } from "@/ui";

export const App: React.FC = () => {
  const isCheckingGit = useRepoStore((s) => s.isCheckingGit);
  const gitInfo = useRepoStore((s) => s.gitInfo);
  const currentRepo = useRepoStore((s) => s.currentRepo);
  const initApp = useRepoStore((s) => s.initApp);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    initApp();
    loadSettings();
  }, [initApp, loadSettings]);

  if (isCheckingGit) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          backgroundColor: "var(--bg)",
          color: "var(--mut)",
          fontSize: "var(--font-size-base)",
        }}
      >
        Инициализация Lode…
      </div>
    );
  }

  // If Git is missing or unsupported version
  if (!gitInfo?.available || !gitInfo?.is_valid_version) {
    return (
      <>
        <GitMissingScreen />
        <ToastContainer />
      </>
    );
  }

  // If no repository is opened yet
  if (!currentRepo) {
    return (
      <>
        <OpenRepoScreen />
        <ToastContainer />
      </>
    );
  }

  // Repository is open
  return (
    <>
      <MainLayout />
      <ToastContainer />
    </>
  );
};

export default App;
