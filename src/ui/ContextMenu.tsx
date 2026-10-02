import React, { useEffect, useRef } from "react";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  x,
  y,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: "var(--bg2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-base)",
        padding: "4px",
        minWidth: "160px",
        zIndex: 200,
        boxShadow: "none",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            textAlign: "left",
            padding: "5px 8px",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: item.disabled ? "default" : "pointer",
            color: item.danger ? "var(--del)" : "var(--tx)",
            opacity: item.disabled ? 0.5 : 1,
            fontSize: "var(--font-size-base)",
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.backgroundColor = "var(--bg3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {item.icon && <span>{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
