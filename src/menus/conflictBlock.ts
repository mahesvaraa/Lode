import type { MenuItem } from "@/store/contextMenuStore";

export interface ConflictBlockMenuCallbacks {
  onTakeLeft: (blockIndex: number) => void;
  onTakeRight: (blockIndex: number) => void;
  onTakeBothLeftFirst: (blockIndex: number) => void;
  onTakeBothRightFirst: (blockIndex: number) => void;
  onRevertBlock: (blockIndex: number) => void;
}

export function buildConflictBlockMenu(
  blockIndex: number,
  labels: { left: string; right: string },
  callbacks: ConflictBlockMenuCallbacks
): MenuItem[] {
  return [
    {
      type: "item",
      id: "conflict:take-left",
      label: `Взять: ${labels.left}`,
      run: () => callbacks.onTakeLeft(blockIndex),
    },
    {
      type: "item",
      id: "conflict:take-right",
      label: `Взять: ${labels.right}`,
      run: () => callbacks.onTakeRight(blockIndex),
    },
    { type: "separator" },
    {
      type: "item",
      id: "conflict:take-both-lr",
      label: "Обе стороны (левое, затем правое)",
      run: () => callbacks.onTakeBothLeftFirst(blockIndex),
    },
    {
      type: "item",
      id: "conflict:take-both-rl",
      label: "Обе стороны (правое, затем левое)",
      run: () => callbacks.onTakeBothRightFirst(blockIndex),
    },
    { type: "separator" },
    {
      type: "item",
      id: "conflict:revert",
      label: "Откатить блок к исходным маркерам",
      run: () => callbacks.onRevertBlock(blockIndex),
    },
  ];
}
