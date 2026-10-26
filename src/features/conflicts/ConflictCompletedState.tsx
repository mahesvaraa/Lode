import React from "react";
import { Button, Input, CheckIcon } from "@/ui";
import type { RepoState } from "@/api/types/repo_state";

interface ConflictCompletedStateProps {
  repoState: RepoState;
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  isContinuing: boolean;
  onAbort: () => void;
  onContinue: () => void;
}

export const ConflictCompletedState: React.FC<ConflictCompletedStateProps> = ({
  repoState,
  commitMessage,
  setCommitMessage,
  isContinuing,
  onAbort,
  onContinue,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "32px",
        textAlign: "center",
        backgroundColor: "var(--bg)",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          backgroundColor: "var(--bg2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <CheckIcon size={36} style={{ color: "var(--add)" }} />
        </div>
        <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)", color: "var(--tx)" }}>
          Все конфликты разрешены!
        </h3>
        <p style={{ margin: 0, fontSize: "var(--font-size-base)", color: "var(--mut)", lineHeight: 1.5 }}>
          Все файлы добавлены в индекс. Вы можете завершить операцию ({repoState.message}) или отменить её.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left" }}>
          <label style={{ fontSize: "12px", color: "var(--mut)" }}>
            Сообщение коммита слияния:
          </label>
          <Input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
          <Button size="md" variant="ghost" onClick={onAbort}>
            Отменить слияние
          </Button>
          <Button
            size="md"
            variant="primary"
            disabled={isContinuing}
            onClick={onContinue}
          >
            {isContinuing ? "Завершение..." : "Продолжить"}
          </Button>
        </div>
      </div>
    </div>
  );
};
