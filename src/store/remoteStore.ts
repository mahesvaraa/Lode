import { create } from "zustand";
import {
  listRemotes,
  addRemote,
  removeRemote,
  renameRemote,
  setRemoteUrl,
  fetchAll,
  pull,
  push,
} from "@/api/client";
import type { Remote } from "@/api/types/remote";
import type { PullMode } from "@/api/types/pull_mode";

interface RemoteState {
  remotes: Remote[];
  isLoading: boolean;
  isFetching: boolean;
  isPulling: boolean;
  isPushing: boolean;
  operationMessage: string | null;
  error: string | null;
  pullMode: PullMode;

  loadRemotes: (repoPath: string) => Promise<void>;
  addRemote: (repoPath: string, name: string, url: string) => Promise<void>;
  removeRemote: (repoPath: string, name: string) => Promise<void>;
  renameRemote: (repoPath: string, oldName: string, newName: string) => Promise<void>;
  setRemoteUrl: (repoPath: string, name: string, url: string) => Promise<void>;
  fetch: (repoPath: string, prune?: boolean) => Promise<string>;
  pull: (repoPath: string, remote?: string, branch?: string) => Promise<string>;
  push: (
    repoPath: string,
    remote?: string,
    branch?: string,
    setUpstream?: boolean,
    forceWithLease?: boolean
  ) => Promise<string>;
  setPullMode: (mode: PullMode) => void;
  clearError: () => void;
  clearMessage: () => void;
  reset: () => void;
}

export const useRemoteStore = create<RemoteState>((set, get) => ({
  remotes: [],
  isLoading: false,
  isFetching: false,
  isPulling: false,
  isPushing: false,
  operationMessage: null,
  error: null,
  pullMode: "FfOnly",

  loadRemotes: async (repoPath: string) => {
    try {
      const remotes = await listRemotes(repoPath);
      set({ remotes });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ error: errorObj.message || "Ошибка загрузки списка remotes" });
    }
  },

  addRemote: async (repoPath, name, url) => {
    set({ isLoading: true, error: null });
    try {
      await addRemote(repoPath, name, url);
      await get().loadRemotes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка добавления remote" });
      throw err;
    }
  },

  removeRemote: async (repoPath, name) => {
    set({ isLoading: true, error: null });
    try {
      await removeRemote(repoPath, name);
      await get().loadRemotes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка удаления remote" });
      throw err;
    }
  },

  renameRemote: async (repoPath, oldName, newName) => {
    set({ isLoading: true, error: null });
    try {
      await renameRemote(repoPath, oldName, newName);
      await get().loadRemotes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка переименования remote" });
      throw err;
    }
  },

  setRemoteUrl: async (repoPath, name, url) => {
    set({ isLoading: true, error: null });
    try {
      await setRemoteUrl(repoPath, name, url);
      await get().loadRemotes(repoPath);
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({ isLoading: false, error: errorObj.message || "Ошибка изменения URL remote" });
      throw err;
    }
  },

  fetch: async (repoPath, prune = true) => {
    set({ isFetching: true, error: null, operationMessage: null });
    try {
      const res = await fetchAll(repoPath, prune);
      set({ isFetching: false, operationMessage: res || "Получение обновлений (fetch) завершено" });
      return res;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || "Ошибка fetch";
      set({ isFetching: false, error: msg });
      throw err;
    }
  },

  pull: async (repoPath, remote, branch) => {
    const { pullMode } = get();
    set({ isPulling: true, error: null, operationMessage: null });
    try {
      const res = await pull(repoPath, remote, branch, pullMode);
      set({ isPulling: false, operationMessage: res || "Слияние с сервером (pull) завершено" });
      return res;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || "Ошибка pull";
      set({ isPulling: false, error: msg });
      throw err;
    }
  },

  push: async (repoPath, remote, branch, setUpstream = false, forceWithLease = false) => {
    set({ isPushing: true, error: null, operationMessage: null });
    try {
      const res = await push(repoPath, remote, branch, setUpstream, forceWithLease);
      set({ isPushing: false, operationMessage: res || "Отправка на сервер (push) завершена" });
      return res;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj.message || "Ошибка push";
      set({ isPushing: false, error: msg });
      throw err;
    }
  },

  setPullMode: (mode) => set({ pullMode: mode }),
  clearError: () => set({ error: null }),
  clearMessage: () => set({ operationMessage: null }),
  reset: () =>
    set({
      remotes: [],
      isLoading: false,
      isFetching: false,
      isPulling: false,
      isPushing: false,
      operationMessage: null,
      error: null,
      pullMode: "FfOnly",
    }),
}));
