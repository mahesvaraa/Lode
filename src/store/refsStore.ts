import { create } from "zustand";
import {
  getRefs,
  getRepoState,
  createBranch,
  switchBranch,
  renameBranch,
  deleteBranch,
  createTag,
  deleteTag,
  mergeBranch,
  abortMerge,
} from "@/api/client";
import type { RepoRefs } from "@/api/types/repo_refs";
import type { RepoState } from "@/api/types/repo_state";
import { useRepoStore } from "./repoStore";

interface RefsState {
  refs: RepoRefs | null;
  repoState: RepoState | null;
  isLoading: boolean;
  error: string | null;

  loadRefs: (repoPath: string) => Promise<void>;
  loadRepoState: (repoPath: string) => Promise<void>;
  createBranch: (
    repoPath: string,
    name: string,
    startPoint?: string,
    switchTo?: boolean
  ) => Promise<void>;
  switchBranch: (repoPath: string, name: string) => Promise<void>;
  renameBranch: (
    repoPath: string,
    oldName: string,
    newName: string
  ) => Promise<void>;
  deleteBranch: (
    repoPath: string,
    name: string,
    force?: boolean
  ) => Promise<void>;
  createTag: (
    repoPath: string,
    name: string,
    targetHash?: string,
    message?: string
  ) => Promise<void>;
  deleteTag: (repoPath: string, name: string) => Promise<void>;
  mergeBranch: (
    repoPath: string,
    branchOrRef: string,
    noFf?: boolean
  ) => Promise<RepoState>;
  abortMerge: (repoPath: string) => Promise<RepoState>;
  clearError: () => void;
  reset: () => void;
}

export const useRefsStore = create<RefsState>((set, get) => ({
  refs: null,
  repoState: null,
  isLoading: false,
  error: null,

  loadRefs: async (repoPath: string) => {
    try {
      const refs = await getRefs(repoPath);
      set({ refs });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ error: errorObj.message || "Ошибка загрузки ссылок репозитория" });
    }
  },

  loadRepoState: async (repoPath: string) => {
    try {
      const state = await getRepoState(repoPath);
      set({ repoState: state });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ error: errorObj.message || "Ошибка определения состояния репозитория" });
    }
  },

  createBranch: async (repoPath, name, startPoint, switchTo) => {
    set({ isLoading: true, error: null });
    try {
      await createBranch(repoPath, name, startPoint, switchTo);
      if (switchTo) {
        useRepoStore.getState().updateCurrentBranch(name);
      }
      await Promise.all([get().loadRefs(repoPath), get().loadRepoState(repoPath)]);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка создания ветки" });
      throw err;
    }
  },

  switchBranch: async (repoPath, name) => {
    set({ isLoading: true, error: null });
    try {
      await switchBranch(repoPath, name);
      useRepoStore.getState().updateCurrentBranch(name);
      await Promise.all([get().loadRefs(repoPath), get().loadRepoState(repoPath)]);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка переключения ветки" });
      throw err;
    }
  },

  renameBranch: async (repoPath, oldName, newName) => {
    set({ isLoading: true, error: null });
    try {
      await renameBranch(repoPath, oldName, newName);
      await get().loadRefs(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка переименования ветки" });
      throw err;
    }
  },

  deleteBranch: async (repoPath, name, force) => {
    set({ isLoading: true, error: null });
    try {
      await deleteBranch(repoPath, name, force);
      await get().loadRefs(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка удаления ветки" });
      throw err;
    }
  },

  createTag: async (repoPath, name, targetHash, message) => {
    set({ isLoading: true, error: null });
    try {
      await createTag(repoPath, name, targetHash, message);
      await get().loadRefs(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка создания тега" });
      throw err;
    }
  },

  deleteTag: async (repoPath, name) => {
    set({ isLoading: true, error: null });
    try {
      await deleteTag(repoPath, name);
      await get().loadRefs(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка удаления тега" });
      throw err;
    }
  },

  mergeBranch: async (repoPath, branchOrRef, noFf) => {
    set({ isLoading: true, error: null });
    try {
      const state = await mergeBranch(repoPath, branchOrRef, noFf);
      set({ repoState: state, isLoading: false });
      await get().loadRefs(repoPath);
      return state;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка слияния веток" });
      throw err;
    }
  },

  abortMerge: async (repoPath) => {
    set({ isLoading: true, error: null });
    try {
      const state = await abortMerge(repoPath);
      set({ repoState: state, isLoading: false });
      await get().loadRefs(repoPath);
      return state;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка отмены слияния" });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ refs: null, repoState: null, isLoading: false, error: null }),
}));
