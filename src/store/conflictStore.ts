import { create } from "zustand";
import {
  getConflictFile,
  resolveConflictFile,
  resolveConflictChoice,
  regenerateConflictDiff3,
  continueOperation,
} from "@/api/client";
import type { ParsedConflictFile } from "@/api/types/parsed_conflict_file";
import type { RepoState } from "@/api/types/repo_state";
import {
  hasConflictMarkers,
  parseConflictContent,
  resolveBlockInContent,
  type BlockResolutionChoice,
} from "@/lib/conflictParser";

export interface SideLabels {
  leftTitle: string;
  leftSubtitle: string;
  rightTitle: string;
  rightSubtitle: string;
}

export function computeSideLabels(
  repoState: RepoState | null,
  currentBranch: string | null
): SideLabels {
  if (repoState?.kind === "Merge") {
    return {
      leftTitle: "Текущая ветка",
      leftSubtitle: currentBranch || "main",
      rightTitle: "Вливаемая ветка",
      rightSubtitle: repoState.head_name || "incoming",
    };
  }
  if (repoState?.kind === "Rebase") {
    return {
      leftTitle: "Основа (upstream)",
      leftSubtitle: repoState.onto || "upstream",
      rightTitle: "Ваш коммит",
      rightSubtitle: repoState.head_name || "rebase commit",
    };
  }
  if (repoState?.kind === "CherryPick") {
    return {
      leftTitle: "Основа ветки",
      leftSubtitle: currentBranch || "main",
      rightTitle: "Переносимый коммит",
      rightSubtitle: repoState.head_name || "cherry-pick",
    };
  }
  return {
    leftTitle: "Наша версия",
    leftSubtitle: "ours",
    rightTitle: "Их версия",
    rightSubtitle: "theirs",
  };
}

interface ConflictState {
  selectedFilePath: string | null;
  activeFile: ParsedConflictFile | null;
  resolvedContent: string;
  currentBlockIndex: number;
  isLoading: boolean;
  isSaving: boolean;
  isContinuing: boolean;
  error: string | null;

  selectConflictFile: (repoPath: string, path: string) => Promise<void>;
  updateResolvedContent: (content: string) => void;
  applyBlockChoice: (choice: BlockResolutionChoice) => void;
  regenerateDiff3: (repoPath: string) => Promise<void>;
  resolveCurrentFile: (repoPath: string) => Promise<void>;
  resolveByChoice: (
    repoPath: string,
    path: string,
    choice: "ours" | "theirs" | "delete" | "keep"
  ) => Promise<void>;
  continueCurrentOperation: (
    repoPath: string,
    message?: string
  ) => Promise<RepoState>;
  nextBlock: () => void;
  prevBlock: () => void;
  clearError: () => void;
  reset: () => void;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  selectedFilePath: null,
  activeFile: null,
  resolvedContent: "",
  currentBlockIndex: 0,
  isLoading: false,
  isSaving: false,
  isContinuing: false,
  error: null,

  selectConflictFile: async (repoPath, path) => {
    set({ isLoading: true, error: null, selectedFilePath: path });
    try {
      const activeFile = await getConflictFile(repoPath, path);
      // If file has identical suggestions or blocks, initialize resolvedContent with suggestion or raw
      const initialText = activeFile.clean_text_suggestion || "";
      set({
        activeFile,
        resolvedContent: initialText,
        currentBlockIndex: 0,
        isLoading: false,
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      set({
        isLoading: false,
        error: errObj.message || "Ошибка загрузки файла с конфликтом",
      });
    }
  },

  updateResolvedContent: (content: string) => {
    set({ resolvedContent: content });
  },

  applyBlockChoice: (choice: BlockResolutionChoice) => {
    const { activeFile, resolvedContent, currentBlockIndex } = get();
    if (!activeFile || activeFile.blocks.length === 0) return;

    const block = activeFile.blocks[currentBlockIndex];
    if (!block) return;

    // Apply choice using helper
    const newContent = resolveBlockInContent(resolvedContent, block, choice);

    // Re-parse newly resolved content to re-identify remaining blocks
    const reParsed = parseConflictContent(activeFile.path, newContent);

    set({
      resolvedContent: newContent,
      activeFile: reParsed,
      currentBlockIndex: Math.min(
        currentBlockIndex,
        Math.max(0, reParsed.blocks.length - 1)
      ),
    });
  },

  regenerateDiff3: async (repoPath: string) => {
    const { selectedFilePath } = get();
    if (!selectedFilePath) return;

    set({ isLoading: true, error: null });
    try {
      const activeFile = await regenerateConflictDiff3(repoPath, selectedFilePath);
      set({
        activeFile,
        resolvedContent: activeFile.clean_text_suggestion || "",
        currentBlockIndex: 0,
        isLoading: false,
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      set({
        isLoading: false,
        error: errObj.message || "Ошибка перегенерации diff3",
      });
    }
  },

  resolveCurrentFile: async (repoPath: string) => {
    const { selectedFilePath, resolvedContent } = get();
    if (!selectedFilePath) return;

    if (hasConflictMarkers(resolvedContent)) {
      set({
        error:
          "Файл содержит маркеры конфликта (<<<<<<<, =======, >>>>>>>). Удалите или разрешите все маркеры перед сохранением.",
      });
      return;
    }

    set({ isSaving: true, error: null });
    try {
      await resolveConflictFile(repoPath, selectedFilePath, resolvedContent);
      set({ isSaving: false, activeFile: null, selectedFilePath: null, resolvedContent: "" });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      set({
        isSaving: false,
        error: errObj.message || "Ошибка сохранения разрешённого файла",
      });
      throw err;
    }
  },

  resolveByChoice: async (repoPath, path, choice) => {
    set({ isSaving: true, error: null });
    try {
      await resolveConflictChoice(repoPath, path, choice);
      set({ isSaving: false, activeFile: null, selectedFilePath: null, resolvedContent: "" });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      set({
        isSaving: false,
        error: errObj.message || "Ошибка применения выбора",
      });
      throw err;
    }
  },

  continueCurrentOperation: async (repoPath, message) => {
    set({ isContinuing: true, error: null });
    try {
      const newState = await continueOperation(repoPath, message);
      set({ isContinuing: false });
      return newState;
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      set({
        isContinuing: false,
        error: errObj.message || "Ошибка продолжения операции",
      });
      throw err;
    }
  },

  nextBlock: () => {
    const { activeFile, currentBlockIndex } = get();
    if (!activeFile || activeFile.blocks.length === 0) return;
    if (currentBlockIndex < activeFile.blocks.length - 1) {
      set({ currentBlockIndex: currentBlockIndex + 1 });
    }
  },

  prevBlock: () => {
    const { currentBlockIndex } = get();
    if (currentBlockIndex > 0) {
      set({ currentBlockIndex: currentBlockIndex - 1 });
    }
  },

  clearError: () => set({ error: null }),
  reset: () =>
    set({
      selectedFilePath: null,
      activeFile: null,
      resolvedContent: "",
      currentBlockIndex: 0,
      isLoading: false,
      isSaving: false,
      isContinuing: false,
      error: null,
    }),
}));
