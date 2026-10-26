import { create } from "zustand";
import {
  getCommits,
  getCommitDetails,
  getCommitDiff,
  getRevisionDiff,
  getGitUser,
} from "@/api/client";
import { computeGraph, type GraphNode } from "@/lib/graph";
import type { Commit } from "@/api/types/commit";
import type { CommitDetails } from "@/api/types/commit_details";
import type { FileDiff } from "@/api/types/file_diff";

const PAGE_SIZE = 500;

export type DateFilterPeriod = "all" | "today" | "week" | "month" | "year";

function dateFilterToSince(period: DateFilterPeriod): string | undefined {
  switch (period) {
    case "today":
      return "today";
    case "week":
      return "1.week.ago";
    case "month":
      return "1.month.ago";
    case "year":
      return "1.year.ago";
    default:
      return undefined;
  }
}

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

  comparisonBaseHash: string | null;
  comparisonTargetHash: string | null;
  comparisonDiffs: FileDiff[] | null;
  isLoadingComparison: boolean;
  selectedComparisonFileIndex: number | null;

  searchQuery: string;
  selectedBranch: string;
  authorFilter: string;
  dateFilter: DateFilterPeriod;
  currentUser: string | null;
  onlyMyCommits: boolean;

  loadInitial: (repoPath: string) => Promise<void>;
  loadMore: (repoPath: string) => Promise<void>;
  selectCommit: (repoPath: string, hash: string | null) => Promise<void>;
  selectCommitFile: (repoPath: string, path: string | null) => Promise<void>;
  compareCommits: (
    repoPath: string,
    baseHash: string,
    targetHash: string
  ) => Promise<void>;
  selectComparisonFile: (index: number | null) => void;
  clearComparison: () => void;
  setSearchQuery: (repoPath: string, query: string) => Promise<void>;
  setSelectedBranch: (repoPath: string, branch: string) => Promise<void>;
  setAuthorFilter: (repoPath: string, author: string) => Promise<void>;
  setDateFilter: (repoPath: string, dateFilter: DateFilterPeriod) => Promise<void>;
  setOnlyMyCommits: (repoPath: string, onlyMine: boolean) => Promise<void>;
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

  comparisonBaseHash: null,
  comparisonTargetHash: null,
  comparisonDiffs: null,
  isLoadingComparison: false,
  selectedComparisonFileIndex: null,

  searchQuery: "",
  selectedBranch: "ALL",
  authorFilter: "",
  dateFilter: "all",
  currentUser: null,
  onlyMyCommits: false,

  loadInitial: async (repoPath: string) => {
    set({
      isLoading: true,
      error: null,
      hasMore: true,
    });

    try {
      let { currentUser } = get();
      if (!currentUser) {
        currentUser = await getGitUser(repoPath);
        if (currentUser) set({ currentUser });
      }

      const { selectedBranch, searchQuery, onlyMyCommits, authorFilter, dateFilter } = get();
      const effectiveAuthor = onlyMyCommits ? currentUser || undefined : (authorFilter || undefined);
      const sinceDate = dateFilterToSince(dateFilter);

      const newCommits = await getCommits(
        repoPath,
        0,
        PAGE_SIZE,
        selectedBranch,
        searchQuery,
        effectiveAuthor,
        sinceDate
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
    const { commits, lanesState, isLoading, hasMore, selectedBranch, searchQuery, onlyMyCommits, currentUser, authorFilter, dateFilter } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    try {
      const effectiveAuthor = onlyMyCommits ? currentUser || undefined : (authorFilter || undefined);
      const sinceDate = dateFilterToSince(dateFilter);
      const newCommits = await getCommits(
        repoPath,
        commits.length,
        PAGE_SIZE,
        selectedBranch,
        searchQuery,
        effectiveAuthor,
        sinceDate
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

  compareCommits: async (
    repoPath: string,
    baseHash: string,
    targetHash: string
  ) => {
    set({
      comparisonBaseHash: baseHash,
      comparisonTargetHash: targetHash,
      isLoadingComparison: true,
      comparisonDiffs: null,
      selectedComparisonFileIndex: 0,
    });

    try {
      const diffs = await getRevisionDiff(repoPath, baseHash, targetHash);
      set({
        comparisonDiffs: diffs,
        isLoadingComparison: false,
        selectedComparisonFileIndex: diffs.length > 0 ? 0 : null,
      });
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      set({
        isLoadingComparison: false,
        error: errorObj.message || "Ошибка сравнения коммитов",
      });
    }
  },

  selectComparisonFile: (index: number | null) => {
    set({ selectedComparisonFileIndex: index });
  },

  clearComparison: () => {
    set({
      comparisonBaseHash: null,
      comparisonTargetHash: null,
      comparisonDiffs: null,
      isLoadingComparison: false,
      selectedComparisonFileIndex: null,
    });
  },

  setSearchQuery: async (repoPath: string, query: string) => {
    set({ searchQuery: query });
    await get().loadInitial(repoPath);
  },

  setSelectedBranch: async (repoPath: string, branch: string) => {
    set({ selectedBranch: branch });
    await get().loadInitial(repoPath);
  },

  setAuthorFilter: async (repoPath: string, authorFilter: string) => {
    set({ authorFilter });
    await get().loadInitial(repoPath);
  },

  setDateFilter: async (repoPath: string, dateFilter: DateFilterPeriod) => {
    set({ dateFilter });
    await get().loadInitial(repoPath);
  },

  setOnlyMyCommits: async (repoPath: string, onlyMyCommits: boolean) => {
    set({ onlyMyCommits });
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
      comparisonBaseHash: null,
      comparisonTargetHash: null,
      comparisonDiffs: null,
      isLoadingComparison: false,
      selectedComparisonFileIndex: null,
      searchQuery: "",
      selectedBranch: "ALL",
      authorFilter: "",
      dateFilter: "all",
      onlyMyCommits: false,
    }),
}));
