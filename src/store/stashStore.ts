import { create } from "zustand";
import {
  listStashes,
  stashSave,
  stashApply,
  stashPop,
  stashDrop,
  stashShowDiff,
} from "@/api/client";
import type { StashItem } from "@/api/types/stash_item";

interface StashState {
  stashes: StashItem[];
  selectedStashDiff: string | null;
  selectedSelector: string | null;
  isLoading: boolean;
  error: string | null;

  loadStashes: (repoPath: string) => Promise<void>;
  saveStash: (
    repoPath: string,
    message?: string,
    includeUntracked?: boolean
  ) => Promise<void>;
  applyStash: (repoPath: string, selector: string) => Promise<void>;
  popStash: (repoPath: string, selector: string) => Promise<void>;
  dropStash: (repoPath: string, selector: string) => Promise<void>;
  loadStashDiff: (repoPath: string, selector: string) => Promise<void>;
  clearDiff: () => void;
  clearError: () => void;
  reset: () => void;
}

export const useStashStore = create<StashState>((set, get) => ({
  stashes: [],
  selectedStashDiff: null,
  selectedSelector: null,
  isLoading: false,
  error: null,

  loadStashes: async (repoPath: string) => {
    try {
      const stashes = await listStashes(repoPath);
      set({ stashes });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ error: errorObj.message || "Ошибка загрузки списка stash" });
    }
  },

  saveStash: async (repoPath, message, includeUntracked = true) => {
    set({ isLoading: true, error: null });
    try {
      await stashSave(repoPath, message, includeUntracked);
      await get().loadStashes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка создания stash" });
      throw err;
    }
  },

  applyStash: async (repoPath, selector) => {
    set({ isLoading: true, error: null });
    try {
      await stashApply(repoPath, selector);
      await get().loadStashes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка применения stash" });
      throw err;
    }
  },

  popStash: async (repoPath, selector) => {
    set({ isLoading: true, error: null });
    try {
      await stashPop(repoPath, selector);
      await get().loadStashes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      // Pop might fail due to conflicts; still reload stashes
      await get().loadStashes(repoPath);
      set({ isLoading: false, error: errorObj.message || "Ошибка извлечения stash (конфликт)" });
      throw err;
    }
  },

  dropStash: async (repoPath, selector) => {
    set({ isLoading: true, error: null });
    try {
      await stashDrop(repoPath, selector);
      if (get().selectedSelector === selector) {
        set({ selectedSelector: null, selectedStashDiff: null });
      }
      await get().loadStashes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка удаления stash" });
      throw err;
    }
  },

  loadStashDiff: async (repoPath, selector) => {
    try {
      const diff = await stashShowDiff(repoPath, selector);
      set({ selectedSelector: selector, selectedStashDiff: diff });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ error: errorObj.message || "Ошибка загрузки diff stash" });
    }
  },

  clearDiff: () => set({ selectedSelector: null, selectedStashDiff: null }),
  clearError: () => set({ error: null }),
  reset: () =>
    set({
      stashes: [],
      selectedStashDiff: null,
      selectedSelector: null,
      isLoading: false,
      error: null,
    }),
}));
