import React from "react";
import { Button } from "@/ui";
import type { SideLabels } from "@/store/conflictStore";

interface NonTextConflictViewProps {
  filePath: string;
  sideLabels: SideLabels;
  onChoice: (choice: "ours" | "theirs" | "delete" | "keep") => void;
}

export const NonTextConflictView: React.FC<NonTextConflictViewProps> = ({
  filePath,
  sideLabels,
  onChoice,
}) => {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          backgroundColor: "var(--bg2)",
          padding: "24px",
          borderRadius: "var(--radius-base)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <h4 style={{ margin: 0, color: "var(--tx)" }}>Конфликт в файле: {filePath}</h4>
        <p
          style={{
            margin: 0,
            color: "var(--mut)",
            fontSize: "var(--font-size-sm)",
            lineHeight: 1.5,
          }}
        >
          В файле отсутствуют стандартные текстовые маркеры конфликта (бинарный файл
          или конфликт удаления/изменения). Выберите действие для разрешения конфликта:
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
            marginTop: "8px",
          }}
        >
          <Button size="sm" variant="default" onClick={() => onChoice("ours")}>
            Взять нашу версию ({sideLabels.leftTitle})
          </Button>
          <Button size="sm" variant="default" onClick={() => onChoice("theirs")}>
            Взять их версию ({sideLabels.rightTitle})
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onChoice("keep")}>
            Оставить файл (git add)
          </Button>
          <Button size="sm" variant="primary" onClick={() => onChoice("delete")}>
            Удалить файл (git rm)
          </Button>
        </div>
      </div>
    </div>
  );
};
