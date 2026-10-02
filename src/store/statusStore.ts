import { create } from "zustand";
import { getStatus, getDiff } from "@/api/client";
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

  diffMode: DiffMode;
  showFullDiff: boolean;

  loadStatus: (repoPath: string) => Promise<void>;
  selectFile: (repoPath: string, file: SelectedFile | null) => Promise<void>;
  setDiffMode: (mode: DiffMode) => void;
  setShowFullDiff: (show: boolean) => void;
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

  diffMode: "inline",
  showFullDiff: false,

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
          // Select another file if available
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
