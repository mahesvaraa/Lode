import { create } from "zustand";
import {
  checkGit,
  getSettings,
  openRepo,
  pickFolder,
  removeRecentRepo,
} from "@/api/client";
import type { GitInfo } from "@/api/types/git_info";
import type { RepoDetails } from "@/api/types/repo_details";
import { useUiStore, type ThemeMode } from "./uiStore";

interface RepoState {
  currentRepo: RepoDetails | null;
  gitInfo: GitInfo | null;
  recentRepos: string[];
  isCheckingGit: boolean;
  isLoadingRepo: boolean;
  repoError: string | null;

  initApp: () => Promise<void>;
  openRepository: (path: string) => Promise<boolean>;
  chooseAndOpenRepo: () => Promise<boolean>;
  closeRepo: () => void;
  removeRecent: (path: string) => Promise<void>;
  setGitInfo: (info: GitInfo) => void;
  updateCurrentBranch: (branch: string) => void;
  clearError: () => void;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  currentRepo: null,
  gitInfo: null,
  recentRepos: [],
  isCheckingGit: true,
  isLoadingRepo: false,
  repoError: null,

  initApp: async () => {
    set({ isCheckingGit: true });
    try {
      const [git, settings] = await Promise.all([checkGit(), getSettings()]);

      if (settings.theme) {
        useUiStore.getState().setTheme(settings.theme as ThemeMode);
      }

      // Automatically restore last opened repository
      const savedPath =
        (typeof localStorage !== "undefined" && localStorage.getItem("lode:current_repo")) ||
        settings.recent_repos[0];

      if (savedPath) {
        await get().openRepository(savedPath);
      }

      set({
        gitInfo: git,
        recentRepos: settings.recent_repos,
        isCheckingGit: false,
      });
    } catch (err) {
      console.error("Failed to initialize app:", err);
      set({ isCheckingGit: false });
    }
  },

  openRepository: async (path: string) => {
    set({ isLoadingRepo: true, repoError: null });
    try {
      const details = await openRepo(path);
      const settings = await getSettings();
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("lode:current_repo", details.path);
      }
      set({
        currentRepo: details,
        recentRepos: settings.recent_repos,
        isLoadingRepo: false,
        repoError: null,
      });
      return true;
    } catch (err: unknown) {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("lode:current_repo");
      }
      const errorObj = err as { message?: string };
      set({
        isLoadingRepo: false,
        repoError: errorObj.message || "Не удалось открыть репозиторий",
      });
      return false;
    }
  },

  chooseAndOpenRepo: async () => {
    try {
      const selected = await pickFolder();
      if (selected) {
        return await get().openRepository(selected);
      }
      return false;
    } catch (err) {
      console.error("Failed to pick folder:", err);
      return false;
    }
  },

  closeRepo: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("lode:current_repo");
    }
    set({ currentRepo: null, repoError: null });
  },

  removeRecent: async (path: string) => {
    try {
      const updated = await removeRecentRepo(path);
      set({ recentRepos: updated.recent_repos });
    } catch (err) {
      console.error("Failed to remove recent repo:", err);
    }
  },

  setGitInfo: (gitInfo) => set({ gitInfo }),
  updateCurrentBranch: (branch: string) => {
    const current = get().currentRepo;
    if (current) {
      set({ currentRepo: { ...current, current_branch: branch } });
    }
  },
  clearError: () => set({ repoError: null }),
}));
