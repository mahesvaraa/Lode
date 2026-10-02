import { create } from "zustand";
import { getCommits, getCommitDetails, getCommitDiff } from "@/api/client";
import { computeGraph, type GraphNode } from "@/lib/graph";
import type { Commit } from "@/api/types/commit";
import type { CommitDetails } from "@/api/types/commit_details";
import type { FileDiff } from "@/api/types/file_diff";

const PAGE_SIZE = 500;

interface HistoryState {
  commits: Commit[];
  graphNodes: GraphNode[];
  lanesState: (string | null)[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;

  selectedCommitHash: string | null;
  commitDetails: CommitDetails | null;
  isLoadingDetails: boolean;

  selectedCommitFile: string | null;
  commitFileDiff: FileDiff | null;
  isLoadingFileDiff: boolean;

  searchQuery: string;
  selectedBranch: string;

  loadInitial: (repoPath: string) => Promise<void>;
  loadMore: (repoPath: string) => Promise<void>;
  selectCommit: (repoPath: string, hash: string | null) => Promise<void>;
  selectCommitFile: (repoPath: string, path: string | null) => Promise<void>;
  setSearchQuery: (repoPath: string, query: string) => Promise<void>;
  setSelectedBranch: (repoPath: string, branch: string) => Promise<void>;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  commits: [],
  graphNodes: [],
  lanesState: [],
  hasMore: true,
  isLoading: false,
  error: null,

  selectedCommitHash: null,
  commitDetails: null,
  isLoadingDetails: false,

  selectedCommitFile: null,
  commitFileDiff: null,
  isLoadingFileDiff: false,

  searchQuery: "",
  selectedBranch: "ALL",

  loadInitial: async (repoPath: string) => {
    set({
      isLoading: true,
      error: null,
      commits: [],
      graphNodes: [],
      lanesState: [],
      hasMore: true,
    });

    try {
      const { selectedBranch, searchQuery } = get();
      const newCommits = await getCommits(
        repoPath,
        0,
        PAGE_SIZE,
        selectedBranch,
        searchQuery
      );

      const graph = computeGraph(newCommits, []);

      set({
        commits: newCommits,
        graphNodes: graph.nodes,
        lanesState: graph.finalLanes,
        hasMore: newCommits.length === PAGE_SIZE,
        isLoading: false,
      });

      // Auto-select first commit if none selected
      if (newCommits.length > 0 && !get().selectedCommitHash) {
        get().selectCommit(repoPath, newCommits[0].hash);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        isLoading: false,
        error: errorObj.message || "Ошибка загрузки истории коммитов",
      });
    }
  },

  loadMore: async (repoPath: string) => {
    const { commits, lanesState, isLoading, hasMore, selectedBranch, searchQuery } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    try {
      const newCommits = await getCommits(
        repoPath,
        commits.length,
        PAGE_SIZE,
        selectedBranch,
        searchQuery
      );

      // Continue graph calculation preserving prior lanesState
      const graph = computeGraph(newCommits, lanesState);

      set({
        commits: [...commits, ...newCommits],
        graphNodes: [...get().graphNodes, ...graph.nodes],
        lanesState: graph.finalLanes,
        hasMore: newCommits.length === PAGE_SIZE,
        isLoading: false,
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        isLoading: false,
        error: errorObj.message || "Ошибка догрузки истории коммитов",
      });
    }
  },

  selectCommit: async (repoPath: string, hash: string | null) => {
    if (!hash) {
      set({
        selectedCommitHash: null,
        commitDetails: null,
        selectedCommitFile: null,
        commitFileDiff: null,
      });
      return;
    }

    set({
      selectedCommitHash: hash,
      isLoadingDetails: true,
      commitDetails: null,
      selectedCommitFile: null,
      commitFileDiff: null,
    });

    try {
      const details = await getCommitDetails(repoPath, hash);
      set({ commitDetails: details, isLoadingDetails: false });

      if (details.files.length > 0) {
        get().selectCommitFile(repoPath, details.files[0].path);
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        isLoadingDetails: false,
        error: errorObj.message || "Ошибка загрузки деталей коммита",
      });
    }
  },

  selectCommitFile: async (repoPath: string, path: string | null) => {
    const hash = get().selectedCommitHash;
    if (!path || !hash) {
      set({ selectedCommitFile: null, commitFileDiff: null });
      return;
    }

    set({ selectedCommitFile: path, isLoadingFileDiff: true, commitFileDiff: null });
    try {
      const diff = await getCommitDiff(repoPath, hash, path);
      set({ commitFileDiff: diff, isLoadingFileDiff: false });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        isLoadingFileDiff: false,
        error: errorObj.message || "Ошибка загрузки diff файла коммита",
      });
    }
  },

  setSearchQuery: async (repoPath: string, query: string) => {
    set({ searchQuery: query });
    await get().loadInitial(repoPath);
  },

  setSelectedBranch: async (repoPath: string, branch: string) => {
    set({ selectedBranch: branch });
    await get().loadInitial(repoPath);
  },

  reset: () =>
    set({
      commits: [],
      graphNodes: [],
      lanesState: [],
      hasMore: true,
      isLoading: false,
      error: null,
      selectedCommitHash: null,
      commitDetails: null,
      isLoadingDetails: false,
      selectedCommitFile: null,
      commitFileDiff: null,
      isLoadingFileDiff: false,
      searchQuery: "",
      selectedBranch: "ALL",
    }),
}));
