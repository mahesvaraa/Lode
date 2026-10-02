import React from "react";
import { useToastStore } from "@/store/toastStore";

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "20px",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "center",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            backgroundColor: "var(--tx)",
            color: "var(--bg)",
            padding: "7px 14px",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-base)",
            fontFamily: "var(--font-ui)",
            boxShadow: "none",
            pointerEvents: "auto",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
};
