import React from "react";
import { Button } from "@/ui";
import type { ConflictBlock } from "@/api/types/conflict_block";
import type { SideLabels } from "@/store/conflictStore";

interface ConflictEditorToolbarProps {
  currentBlockIndex: number;
  totalBlocks: number;
  currentBlock: ConflictBlock | undefined;
  sideLabels: SideLabels;
  isSaving: boolean;
  hasMarkersLeft: boolean;
  onPrevBlock: () => void;
  onNextBlock: () => void;
  onApplyBlockChoice: (
    choice: "ours" | "theirs" | "both-ours-theirs" | "both-theirs-ours"
  ) => void;
  onOpenRegenerateModal: () => void;
  onResolveFile: () => void;
}

export const ConflictEditorToolbar: React.FC<ConflictEditorToolbarProps> = ({
  currentBlockIndex,
  totalBlocks,
  currentBlock,
  sideLabels,
  isSaving,
  hasMarkersLeft,
  onPrevBlock,
  onNextBlock,
  onApplyBlockChoice,
  onOpenRegenerateModal,
  onResolveFile,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        borderBottom: "1px solid var(--line)",
        backgroundColor: "var(--bg2)",
        gap: "10px",
      }}
    >
      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Button
          size="sm"
          variant="ghost"
          disabled={currentBlockIndex === 0}
          onClick={onPrevBlock}
        >
          ◀
        </Button>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--tx)" }}>
          Блок {totalBlocks > 0 ? currentBlockIndex + 1 : 0} из {totalBlocks}
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={totalBlocks === 0 || currentBlockIndex >= totalBlocks - 1}
          onClick={onNextBlock}
        >
          ▶
        </Button>
      </div>

      {/* Block Actions */}
      <div style={{ display: "flex", gap: "4px" }}>
        <Button
          size="sm"
          variant="default"
          disabled={!currentBlock}
          onClick={() => onApplyBlockChoice("ours")}
          title={`Принять левую сторону (${sideLabels.leftTitle})`}
        >
          Взять левое
        </Button>
        <Button
          size="sm"
          variant="default"
          disabled={!currentBlock}
          onClick={() => onApplyBlockChoice("theirs")}
          title={`Принять правую сторону (${sideLabels.rightTitle})`}
        >
          Взять правое
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!currentBlock}
          onClick={() => onApplyBlockChoice("both-ours-theirs")}
          title="Вставить обе стороны: сначала левое, затем правое"
        >
          Обе (левое + правое)
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!currentBlock}
          onClick={() => onApplyBlockChoice("both-theirs-ours")}
          title="Вставить обе стороны: сначала правое, затем левое"
        >
          Обе (правое + левое)
        </Button>
      </div>

      {/* Actions Right */}
      <div style={{ display: "flex", gap: "6px" }}>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenRegenerateModal}
          title="Перегенерировать маркеры со стилем diff3 (включая общий предок base)"
        >
          Diff3
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={isSaving || hasMarkersLeft}
          onClick={onResolveFile}
          title={
            hasMarkersLeft
              ? "Удалите все маркеры перед сохранением"
              : "Сохранить файл и отметить решённым (git add)"
          }
        >
          {isSaving ? "Сохранение..." : "Отметить решённым"}
        </Button>
      </div>
    </div>
  );
};
