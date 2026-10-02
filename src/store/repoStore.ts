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
      set({
        gitInfo: git,
        recentRepos: settings.recent_repos,
        isCheckingGit: false,
      });

      if (settings.theme) {
        useUiStore.getState().setTheme(settings.theme as ThemeMode);
      }
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
      set({
        currentRepo: details,
        recentRepos: settings.recent_repos,
        isLoadingRepo: false,
        repoError: null,
      });
      return true;
    } catch (err: unknown) {
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
  clearError: () => set({ repoError: null }),
}));
