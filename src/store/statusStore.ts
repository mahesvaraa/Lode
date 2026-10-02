import { create } from "zustand";
import {
  getStatus,
  getDiff,
  stageFile as apiStageFile,
  unstageFile as apiUnstageFile,
  stageAll as apiStageAll,
  unstageAll as apiUnstageAll,
  stageHunk as apiStageHunk,
  unstageHunk as apiUnstageHunk,
  stageLines as apiStageLines,
  unstageLines as apiUnstageLines,
  discardLines as apiDiscardLines,
  discardFile as apiDiscardFile,
  createCommit as apiCreateCommit,
} from "@/api/client";
import type { RepoStatus } from "@/api/types/repo_status";
import type { StatusItem } from "@/api/types/status_item";
import type { FileDiff } from "@/api/types/file_diff";

export type DiffMode = "inline" | "side-by-side";

export interface SelectedFile {
  path: string;
  is_staged: boolean;
}

interface StatusState {
  status: RepoStatus | null;
  isLoadingStatus: boolean;
  statusError: string | null;

  selectedFile: SelectedFile | null;
  diff: FileDiff | null;
  isLoadingDiff: boolean;
  diffError: string | null;

  isOperating: boolean;
  operationError: string | null;

  diffMode: DiffMode;
  showFullDiff: boolean;

  loadStatus: (repoPath: string) => Promise<void>;
  selectFile: (repoPath: string, file: SelectedFile | null) => Promise<void>;
  setDiffMode: (mode: DiffMode) => void;
  setShowFullDiff: (show: boolean) => void;
  clearOperationError: () => void;

  stageFile: (repoPath: string, path: string) => Promise<void>;
  unstageFile: (repoPath: string, path: string) => Promise<void>;
  stageAll: (repoPath: string) => Promise<void>;
  unstageAll: (repoPath: string) => Promise<void>;
  stageHunk: (repoPath: string, path: string, hunkIndex: number) => Promise<void>;
  unstageHunk: (repoPath: string, path: string, hunkIndex: number) => Promise<void>;
  stageLines: (repoPath: string, path: string, hunkIndex: number, lineIndices: number[]) => Promise<void>;
  unstageLines: (repoPath: string, path: string, hunkIndex: number, lineIndices: number[]) => Promise<void>;
  discardLines: (repoPath: string, path: string, hunkIndex: number, lineIndices: number[]) => Promise<void>;
  discardFile: (repoPath: string, path: string, isUntracked: boolean) => Promise<void>;
  commit: (repoPath: string, message: string, amend: boolean) => Promise<void>;

  reset: () => void;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  status: null,
  isLoadingStatus: false,
  statusError: null,

  selectedFile: null,
  diff: null,
  isLoadingDiff: false,
  diffError: null,

  isOperating: false,
  operationError: null,

  diffMode: "inline",
  showFullDiff: false,

  clearOperationError: () => set({ operationError: null }),

  loadStatus: async (repoPath: string) => {
    set({ isLoadingStatus: true, statusError: null });
    try {
      const status = await getStatus(repoPath);
      set({ status, isLoadingStatus: false });

      // If a file was selected, re-fetch its diff; or select the first available changed file
      const currentSelected = get().selectedFile;
      if (currentSelected) {
        const stillExists =
          (currentSelected.is_staged
            ? status.staged.some((f) => f.path === currentSelected.path)
            : status.unstaged.some((f) => f.path === currentSelected.path));

        if (stillExists) {
          get().selectFile(repoPath, currentSelected);
        } else {
          const first = status.unstaged[0] || status.staged[0] || null;
          if (first) {
            get().selectFile(repoPath, {
              path: first.path,
              is_staged: first.is_staged,
            });
          } else {
            set({ selectedFile: null, diff: null });
          }
        }
      } else {
        const first = status.unstaged[0] || status.staged[0] || null;
        if (first) {
          get().selectFile(repoPath, {
            path: first.path,
            is_staged: first.is_staged,
          });
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        isLoadingStatus: false,
        statusError: errorObj.message || "Ошибка загрузки статуса",
      });
    }
  },

  selectFile: async (repoPath: string, file: SelectedFile | null) => {
    if (!file) {
      set({ selectedFile: null, diff: null, isLoadingDiff: false });
      return;
    }

    set({ selectedFile: file, isLoadingDiff: true, diffError: null, showFullDiff: false });
    try {
      const diff = await getDiff(repoPath, file.path, file.is_staged);
      set({ diff, isLoadingDiff: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        isLoadingDiff: false,
        diffError: errorObj.message || "Ошибка загрузки diff",
      });
    }
  },

  stageFile: async (repoPath: string, path: string) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiStageFile(repoPath, path);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка индексации файла",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  unstageFile: async (repoPath: string, path: string) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiUnstageFile(repoPath, path);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка исключения файла из индекса",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  stageAll: async (repoPath: string) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiStageAll(repoPath);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка добавления всего в индекс",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  unstageAll: async (repoPath: string) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiUnstageAll(repoPath);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка исключения всего из индекса",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  stageHunk: async (repoPath: string, path: string, hunkIndex: number) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiStageHunk(repoPath, path, hunkIndex);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка индексации hunk",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  unstageHunk: async (repoPath: string, path: string, hunkIndex: number) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiUnstageHunk(repoPath, path, hunkIndex);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка исключения hunk из индекса",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  stageLines: async (repoPath: string, path: string, hunkIndex: number, lineIndices: number[]) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiStageLines(repoPath, path, hunkIndex, lineIndices);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка индексации строк",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  unstageLines: async (repoPath: string, path: string, hunkIndex: number, lineIndices: number[]) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiUnstageLines(repoPath, path, hunkIndex, lineIndices);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка исключения строк из индекса",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  discardLines: async (repoPath: string, path: string, hunkIndex: number, lineIndices: number[]) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiDiscardLines(repoPath, path, hunkIndex, lineIndices);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка отката строк",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  discardFile: async (repoPath: string, path: string, isUntracked: boolean) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiDiscardFile(repoPath, path, isUntracked);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      set({
        operationError: errorObj.details || errorObj.message || "Ошибка отката файла",
      });
    } finally {
      set({ isOperating: false });
    }
  },

  commit: async (repoPath: string, message: string, amend: boolean) => {
    set({ isOperating: true, operationError: null });
    try {
      await apiCreateCommit(repoPath, message, amend);
      await get().loadStatus(repoPath);
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      // Hook outputs appear in details or message
      const hookMsg = errorObj.details ? `${errorObj.message}\n${errorObj.details}` : errorObj.message;
      set({
        operationError: hookMsg || "Ошибка выполнения коммита",
      });
      throw err;
    } finally {
      set({ isOperating: false });
    }
  },

  setDiffMode: (diffMode: DiffMode) => set({ diffMode }),
  setShowFullDiff: (showFullDiff: boolean) => set({ showFullDiff }),

  reset: () =>
    set({
      status: null,
      selectedFile: null,
      diff: null,
      isLoadingStatus: false,
      isLoadingDiff: false,
      statusError: null,
      diffError: null,
      isOperating: false,
      operationError: null,
    }),
}));

export function getFileStatusLabel(status: StatusItem["status"]): string {
  switch (status) {
    case "Modified":
      return "M";
    case "Added":
      return "A";
    case "Deleted":
      return "D";
    case "Renamed":
      return "R";
    case "Copied":
      return "C";
    case "Untracked":
      return "?";
    case "Ignored":
      return "!";
    case "Conflicted":
      return "U";
    case "TypeChanged":
      return "T";
    default:
      return "M";
  }
}
