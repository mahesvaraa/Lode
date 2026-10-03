import React, { useEffect, useRef } from "react";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  confirmVariant?: "primary" | "danger" | "default";
  onConfirm?: () => void;
  onClose: () => void;
  children?: React.ReactNode;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  isDanger = false,
  confirmVariant,
  onConfirm,
  onClose,
  children,
  width = "min(440px, 92vw)",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "14vh",
        zIndex: 100,
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: "var(--bg2)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          width,
          maxWidth: "94vw",
          maxHeight: "85vh",
          boxSizing: "border-box",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
          overflow: "hidden",
        }}
      >
        <h3
          id="modal-title"
          style={{
            margin: 0,
            fontSize: "var(--font-size-md)",
            fontWeight: 600,
            color: "var(--tx)",
            flexShrink: 0,
          }}
        >
          {title}
        </h3>

        {description && (
          <p
            style={{
              margin: 0,
              color: "var(--mut)",
              fontSize: "var(--font-size-base)",
              lineHeight: "1.45",
              flexShrink: 0,
            }}
          >
            {description}
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            flex: 1,
          }}
        >
          {children}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            marginTop: "6px",
            flexShrink: 0,
          }}
        >
          <Button variant="default" onClick={onClose}>
            {cancelLabel}
          </Button>
          {confirmLabel && (
            <Button
              variant={confirmVariant || (isDanger ? "danger" : "primary")}
              onClick={() => {
                onConfirm?.();
              }}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
