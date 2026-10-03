import { create } from "zustand";

export type MenuItem =
  | {
      type: "item";
      id: string;
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      commandHint?: string;
      danger?: boolean;
      disabled?: boolean;
      disabledReason?: string;
      checked?: boolean;
      children?: MenuItem[];
      run?: () => void | Promise<void>;
    }
  | { type: "separator"; id?: string }
  | { type: "header"; id?: string; label: string };

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  hoveredCommandHint: string | null;
  triggerElement: HTMLElement | null;

  openMenu: (
    x: number,
    y: number,
    items: MenuItem[],
    triggerElement?: HTMLElement | null
  ) => void;
  closeMenu: () => void;
  setHoveredCommandHint: (hint: string | null) => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  x: 0,
  y: 0,
  items: [],
  hoveredCommandHint: null,
  triggerElement: null,

  openMenu: (x, y, items, triggerElement = null) => {
    set({
      isOpen: true,
      x,
      y,
      items,
      hoveredCommandHint: null,
      triggerElement,
    });
  },

  closeMenu: () => {
    set((state) => {
      if (state.triggerElement && typeof state.triggerElement.focus === "function") {
        try {
          state.triggerElement.focus();
        } catch {
          // ignore focus errors
        }
      }
      return {
        isOpen: false,
        items: [],
        hoveredCommandHint: null,
        triggerElement: null,
      };
    });
  },

  setHoveredCommandHint: (hint) => {
    set({ hoveredCommandHint: hint });
  },
}));
