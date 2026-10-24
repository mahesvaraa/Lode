import { create } from "zustand";
import { getSubmodules, updateSubmodules, initSubmodule } from "@/api/client";
import type { SubmoduleInfo } from "@/api/types/submodule_info";

interface SubmoduleState {
  submodules: SubmoduleInfo[];
  isLoading: boolean;
  error: string | null;

  loadSubmodules: (repoPath: string) => Promise<void>;
  syncSubmodules: (
    repoPath: string,
    init?: boolean,
    recursive?: boolean,
    path?: string
  ) => Promise<void>;
  initializeSubmodule: (repoPath: string, path?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useSubmoduleStore = create<SubmoduleState>((set, get) => ({
  submodules: [],
  isLoading: false,
  error: null,

  loadSubmodules: async (repoPath: string) => {
    set({ isLoading: true, error: null });
    try {
      const submodules = await getSubmodules(repoPath);
      set({ submodules, isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        error: errorObj.message || "Ошибка загрузки подмодулей",
        isLoading: false,
      });
    }
  },

  syncSubmodules: async (repoPath, init = true, recursive = true, path) => {
    set({ isLoading: true, error: null });
    try {
      await updateSubmodules(repoPath, init, recursive, path);
      await get().loadSubmodules(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        error: errorObj.message || "Ошибка обновления подмодулей",
        isLoading: false,
      });
      throw err;
    }
  },

  initializeSubmodule: async (repoPath, path) => {
    set({ isLoading: true, error: null });
    try {
      await initSubmodule(repoPath, path);
      await get().loadSubmodules(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        error: errorObj.message || "Ошибка инициализации подмодуля",
        isLoading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ submodules: [], isLoading: false, error: null }),
}));
