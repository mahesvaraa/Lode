import { create } from "zustand";
import { getWorktrees, addWorktree, removeWorktree } from "@/api/client";
import type { WorktreeInfo } from "@/api/types/worktree_info";

interface WorktreeState {
  worktrees: WorktreeInfo[];
  isLoading: boolean;
  error: string | null;

  loadWorktrees: (repoPath: string) => Promise<void>;
  createWorktree: (
    repoPath: string,
    path: string,
    branch?: string,
    newBranch?: string
  ) => Promise<void>;
  deleteWorktree: (
    repoPath: string,
    path: string,
    force?: boolean
  ) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useWorktreeStore = create<WorktreeState>((set, get) => ({
  worktrees: [],
  isLoading: false,
  error: null,

  loadWorktrees: async (repoPath: string) => {
    set({ isLoading: true, error: null });
    try {
      const worktrees = await getWorktrees(repoPath);
      set({ worktrees, isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        error: errorObj.message || "Ошибка загрузки списка worktrees",
        isLoading: false,
      });
    }
  },

  createWorktree: async (repoPath, path, branch, newBranch) => {
    set({ isLoading: true, error: null });
    try {
      await addWorktree(repoPath, path, branch, newBranch);
      await get().loadWorktrees(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        error: errorObj.message || "Ошибка создания worktree",
        isLoading: false,
      });
      throw err;
    }
  },

  deleteWorktree: async (repoPath, path, force = false) => {
    set({ isLoading: true, error: null });
    try {
      await removeWorktree(repoPath, path, force);
      await get().loadWorktrees(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        error: errorObj.message || "Ошибка удаления worktree",
        isLoading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ worktrees: [], isLoading: false, error: null }),
}));
