import { create } from "zustand";

export interface ToastMessage {
  id: string;
  message: string;
  kind?: "info" | "success" | "error";
  durationMs?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (message: string, kind?: "info" | "success" | "error", durationMs?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, kind = "info", durationMs = 2600) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, message, kind, durationMs };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, durationMs);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
