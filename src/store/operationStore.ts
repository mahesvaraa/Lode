import { create } from "zustand";
import { cancelOperation } from "@/api/client";

export interface ActiveOperation {
  title: string;
  repoPath: string;
  startedAt: number;
  canCancel: boolean;
}

interface OperationState {
  activeOperation: ActiveOperation | null;
  isCancelling: boolean;

  startOperation: (
    title: string,
    repoPath: string,
    canCancel?: boolean
  ) => void;
  endOperation: () => void;
  cancelActiveOperation: () => Promise<void>;
}

export const useOperationStore = create<OperationState>((set, get) => ({
  activeOperation: null,
  isCancelling: false,

  startOperation: (title, repoPath, canCancel = true) => {
    set({
      activeOperation: {
        title,
        repoPath,
        startedAt: Date.now(),
        canCancel,
      },
      isCancelling: false,
    });
  },

  endOperation: () => {
    set({
      activeOperation: null,
      isCancelling: false,
    });
  },

  cancelActiveOperation: async () => {
    const { activeOperation, isCancelling } = get();
    if (!activeOperation || isCancelling) return;

    set({ isCancelling: true });
    try {
      await cancelOperation();
    } catch (err) {
      console.error("Failed to cancel active operation:", err);
    } finally {
      set({
        activeOperation: null,
        isCancelling: false,
      });
    }
  },
}));
