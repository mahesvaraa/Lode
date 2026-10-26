import React from "react";
import { useOperationStore } from "@/store/operationStore";
import { useI18n } from "@/lib/i18n";

export const OperationProgressIndicator: React.FC = () => {
  const t = useI18n((s) => s.t);
  const activeOperation = useOperationStore((s) => s.activeOperation);
  const isCancelling = useOperationStore((s) => s.isCancelling);
  const cancelActiveOperation = useOperationStore(
    (s) => s.cancelActiveOperation
  );

  if (!activeOperation) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "var(--bg3)",
        border: "1px solid var(--line)",
        borderRadius: "4px",
        padding: "1px 8px",
        fontSize: "11px",
        color: "var(--tx)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: isCancelling ? "var(--del)" : "var(--acc)",
          animation: "pulse 1s infinite",
        }}
      />
      <span style={{ fontWeight: 500 }}>
        {isCancelling ? t.operations.cancelling : activeOperation.title}
      </span>
      {activeOperation.canCancel && !isCancelling && (
        <button
          type="button"
          onClick={cancelActiveOperation}
          title={t.operations.cancelTooltip}
          style={{
            background: "transparent",
            border: "1px solid var(--del)",
            color: "var(--del)",
            borderRadius: "3px",
            padding: "0 6px",
            fontSize: "10px",
            cursor: "pointer",
            fontWeight: 600,
            lineHeight: "16px",
          }}
        >
          {t.operations.cancelBtn}
        </button>
      )}
    </div>
  );
};
