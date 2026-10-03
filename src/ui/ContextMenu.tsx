import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { type MenuItem, useContextMenuStore } from "@/store/contextMenuStore";

export { type MenuItem };

export interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

interface ActiveSubmenuState {
  id: string;
  rect: DOMRect;
  items: MenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  x,
  y,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number>(-1);
  const [activeSubmenu, setActiveSubmenu] = useState<ActiveSubmenuState | null>(
    null
  );
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x, y });
  const submenuTimeoutRef = useRef<number | null>(null);

  const setHoveredCommandHint = useContextMenuStore(
    (s) => s.setHoveredCommandHint
  );

  // Filter only selectable items for keyboard navigation
  const selectableItems = items
    .map((item, index) => ({ item, index }))
    .filter(
      (entry) =>
        entry.item.type === "item" && !entry.item.disabled
    );

  // Position clamping & flipping for the main menu
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 8;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let posX = x;
    let posY = y;

    // Flip horizontally if out of bounds
    if (posX + rect.width > winW - padding) {
      posX = Math.max(padding, posX - rect.width);
    }
    // Flip vertically if out of bounds
    if (posY + rect.height > winH - padding) {
      posY = Math.max(padding, posY - rect.height);
    }

    // Clamp inside viewport
    posX = Math.max(padding, Math.min(posX, winW - rect.width - padding));
    posY = Math.max(padding, Math.min(posY, winH - rect.height - padding));

    setCoords({ x: posX, y: posY });
  }, [isOpen, x, y, items]);

  // Outside click, window blur, resize, and scroll anywhere closes menu
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      const clickedMainMenu = menuRef.current?.contains(targetNode);
      const clickedSubMenu = submenuRef.current?.contains(targetNode);

      if (!clickedMainMenu && !clickedSubMenu) {
        onClose();
      }
    };

    const handleScroll = (e: Event) => {
      const targetNode = e.target as Node;
      // If scrolling inside the menu itself, do NOT close
      if (
        menuRef.current?.contains(targetNode) ||
        submenuRef.current?.contains(targetNode)
      ) {
        return;
      }
      onClose();
    };

    const handleResizeOrBlur = () => {
      onClose();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResizeOrBlur);
    window.addEventListener("blur", handleResizeOrBlur);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResizeOrBlur);
      window.removeEventListener("blur", handleResizeOrBlur);
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, [isOpen, onClose]);

  // Execute item action
  const handleItemClick = useCallback(
    async (item: MenuItem, itemElement?: HTMLElement) => {
      if (item.type !== "item" || item.disabled) return;
      if (item.children && item.children.length > 0) {
        // Toggle submenu immediately
        if (activeSubmenu?.id === item.id) {
          setActiveSubmenu(null);
        } else if (itemElement) {
          const rect = itemElement.getBoundingClientRect();
          setActiveSubmenu({
            id: item.id,
            rect,
            items: item.children,
          });
          setActiveSubmenuIndex(0);
        }
        return;
      }
      onClose();
      if (item.run) {
        try {
          await item.run();
        } catch (err) {
          console.error("Context menu action failed:", err);
        }
      }
    },
    [activeSubmenu, onClose]
  );

  // Submenu hovering with 120ms delay
  const handleMouseEnterItem = (
    item: MenuItem,
    index: number,
    element: HTMLDivElement
  ) => {
    setActiveIndex(index);
    if (item.type === "item") {
      setHoveredCommandHint(item.commandHint || null);
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
      if (item.children && item.children.length > 0 && !item.disabled) {
        const rect = element.getBoundingClientRect();
        submenuTimeoutRef.current = window.setTimeout(() => {
          setActiveSubmenu({
            id: item.id,
            rect,
            items: item.children!,
          });
          setActiveSubmenuIndex(-1);
        }, 120);
      } else {
        submenuTimeoutRef.current = window.setTimeout(() => {
          setActiveSubmenu(null);
        }, 150);
      }
    } else {
      setHoveredCommandHint(null);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      if (activeSubmenu) {
        setActiveSubmenu(null);
      } else {
        onClose();
      }
      return;
    }

    // If submenu is currently active and focused
    if (activeSubmenu) {
      const subSelectables = activeSubmenu.items
        .map((sub, sIdx) => ({ sub, sIdx }))
        .filter((entry) => entry.sub.type === "item" && !entry.sub.disabled);

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveSubmenu(null);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (subSelectables.length === 0) return;
        const currentPos = subSelectables.findIndex(
          (s) => s.sIdx === activeSubmenuIndex
        );
        const nextPos = (currentPos + 1) % subSelectables.length;
        const target = subSelectables[nextPos];
        setActiveSubmenuIndex(target.sIdx);
        if (target.sub.type === "item") {
          setHoveredCommandHint(target.sub.commandHint || null);
        }
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (subSelectables.length === 0) return;
        const currentPos = subSelectables.findIndex(
          (s) => s.sIdx === activeSubmenuIndex
        );
        const prevPos =
          currentPos <= 0 ? subSelectables.length - 1 : currentPos - 1;
        const target = subSelectables[prevPos];
        setActiveSubmenuIndex(target.sIdx);
        if (target.sub.type === "item") {
          setHoveredCommandHint(target.sub.commandHint || null);
        }
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (
          activeSubmenuIndex >= 0 &&
          activeSubmenu.items[activeSubmenuIndex]
        ) {
          handleItemClick(activeSubmenu.items[activeSubmenuIndex]);
        }
        return;
      }
    }

    // Main menu keyboard navigation
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (selectableItems.length === 0) return;
      const currentPos = selectableItems.findIndex(
        (si) => si.index === activeIndex
      );
      const nextPos = (currentPos + 1) % selectableItems.length;
      const target = selectableItems[nextPos];
      setActiveIndex(target.index);
      if (target.item.type === "item") {
        setHoveredCommandHint(target.item.commandHint || null);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (selectableItems.length === 0) return;
      const currentPos = selectableItems.findIndex(
        (si) => si.index === activeIndex
      );
      const prevPos =
        currentPos <= 0 ? selectableItems.length - 1 : currentPos - 1;
      const target = selectableItems[prevPos];
      setActiveIndex(target.index);
      if (target.item.type === "item") {
        setHoveredCommandHint(target.item.commandHint || null);
      }
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      if (selectableItems.length > 0) {
        const target = selectableItems[0];
        setActiveIndex(target.index);
        if (target.item.type === "item") {
          setHoveredCommandHint(target.item.commandHint || null);
        }
      }
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      if (selectableItems.length > 0) {
        const target = selectableItems[selectableItems.length - 1];
        setActiveIndex(target.index);
        if (target.item.type === "item") {
          setHoveredCommandHint(target.item.commandHint || null);
        }
      }
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        const currentItem = items[activeIndex];
        const el = menuRef.current?.querySelector<HTMLElement>(
          `[data-menu-id="${currentItem.id}"]`
        );
        handleItemClick(currentItem, el || undefined);
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const current = items[activeIndex];
      if (current && current.type === "item" && current.children) {
        const el = menuRef.current?.querySelector<HTMLElement>(
          `[data-menu-id="${current.id}"]`
        );
        if (el) {
          const rect = el.getBoundingClientRect();
          setActiveSubmenu({
            id: current.id,
            rect,
            items: current.children,
          });
          setActiveSubmenuIndex(0);
        }
      }
      return;
    }

    // First letter quick jump
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const char = e.key.toLowerCase();
      const match = selectableItems.find((si) =>
        si.item.type === "item" && si.item.label.toLowerCase().startsWith(char)
      );
      if (match) {
        setActiveIndex(match.index);
        if (match.item.type === "item") {
          setHoveredCommandHint(match.item.commandHint || null);
        }
      }
    }
  };

  if (!isOpen || items.length === 0) return null;

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          position: "fixed",
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          backgroundColor: "var(--bg2)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "4px",
          minWidth: "210px",
          maxWidth: "340px",
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 9999,
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
          outline: "none",
          fontFamily: "inherit",
          fontSize: "13px",
          userSelect: "none",
        }}
      >
        {items.map((item, index) => {
          if (item.type === "separator") {
            return (
              <div
                key={`sep-${index}`}
                role="separator"
                style={{
                  height: "1px",
                  backgroundColor: "var(--line)",
                  margin: "4px 0",
                }}
              />
            );
          }

          if (item.type === "header") {
            return (
              <div
                key={`head-${index}`}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--mut)",
                  padding: "6px 12px 2px 12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {item.label}
              </div>
            );
          }

          const isHovered = activeIndex === index;
          const hasSubmenu = Boolean(
            item.children && item.children.length > 0
          );
          const isSubmenuOpen = activeSubmenu?.id === item.id;

          return (
            <div
              key={item.id}
              data-menu-id={item.id}
              role={
                item.checked !== undefined ? "menuitemcheckbox" : "menuitem"
              }
              aria-disabled={item.disabled ? "true" : "false"}
              aria-haspopup={hasSubmenu ? "menu" : undefined}
              aria-expanded={hasSubmenu ? isSubmenuOpen : undefined}
              title={item.disabled ? item.disabledReason : undefined}
              onMouseEnter={(e) =>
                handleMouseEnterItem(item, index, e.currentTarget)
              }
              onClick={(e) => handleItemClick(item, e.currentTarget)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "28px",
                padding: "0 12px",
                borderRadius: "4px",
                cursor: item.disabled ? "not-allowed" : "pointer",
                backgroundColor: isHovered || isSubmenuOpen
                  ? item.disabled
                    ? "transparent"
                    : "var(--bg3)"
                  : "transparent",
                color: item.disabled
                  ? "var(--mut)"
                  : item.danger
                  ? "var(--del)"
                  : "var(--tx)",
                fontSize: "13px",
                transition: "background-color 0.08s ease",
              }}
            >
              {/* Left label & icon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {item.checked !== undefined && (
                  <span
                    style={{
                      width: "14px",
                      display: "inline-block",
                      fontWeight: "bold",
                      color: "var(--acc)",
                    }}
                  >
                    {item.checked ? "✓" : ""}
                  </span>
                )}
                {item.icon && (
                  <span
                    style={{
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {item.icon}
                  </span>
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.label}
                </span>
              </div>

              {/* Right shortcut or submenu arrow */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  paddingLeft: "10px",
                  flexShrink: 0,
                }}
              >
                {item.shortcut && (
                  <span
                    className="mono"
                    style={{
                      fontSize: "11px",
                      color: "var(--mut)",
                    }}
                  >
                    {item.shortcut}
                  </span>
                )}
                {hasSubmenu && (
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--mut)",
                      fontWeight: "bold",
                    }}
                  >
                    ▸
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Render Submenu as fixed overlay to prevent clipping by overflow-y */}
      {activeSubmenu && (
        <Submenu
          ref={submenuRef}
          parentRect={activeSubmenu.rect}
          items={activeSubmenu.items}
          activeIndex={activeSubmenuIndex}
          onSelect={(subItem) => handleItemClick(subItem)}
          onMouseEnter={() => {
            if (submenuTimeoutRef.current) {
              clearTimeout(submenuTimeoutRef.current);
            }
          }}
          onMouseLeave={() => {
            if (submenuTimeoutRef.current) {
              clearTimeout(submenuTimeoutRef.current);
            }
            submenuTimeoutRef.current = window.setTimeout(() => {
              setActiveSubmenu(null);
            }, 150);
          }}
          onHoverItem={(hint) => setHoveredCommandHint(hint)}
        />
      )}
    </>
  );
};

// Submenu component with fixed positioning & boundary check
interface SubmenuProps {
  parentRect: DOMRect;
  items: MenuItem[];
  activeIndex: number;
  onSelect: (item: MenuItem) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onHoverItem: (hint: string | null) => void;
}

const Submenu = React.forwardRef<HTMLDivElement, SubmenuProps>(
  (
    {
      parentRect,
      items,
      activeIndex,
      onSelect,
      onMouseEnter,
      onMouseLeave,
      onHoverItem,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);

    const [subCoords, setSubCoords] = useState<{ x: number; y: number }>({
      x: parentRect.right + 2,
      y: parentRect.top - 4,
    });

    useLayoutEffect(() => {
      if (!internalRef.current) return;
      const rect = internalRef.current.getBoundingClientRect();
      const padding = 8;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let posX = parentRect.right + 2;
      // If overflows right edge, flip to left side of parent menu
      if (posX + rect.width > winW - padding) {
        posX = parentRect.left - rect.width - 2;
      }
      // Clamp horizontally
      posX = Math.max(padding, Math.min(posX, winW - rect.width - padding));

      let posY = parentRect.top - 4;
      // If overflows bottom edge, shift upwards
      if (posY + rect.height > winH - padding) {
        posY = Math.max(padding, winH - rect.height - padding);
      }

      setSubCoords({ x: posX, y: posY });
    }, [parentRect]);

    return (
      <div
        ref={internalRef}
        role="menu"
        style={{
          position: "fixed",
          left: `${subCoords.x}px`,
          top: `${subCoords.y}px`,
          backgroundColor: "var(--bg2)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "4px",
          minWidth: "190px",
          maxWidth: "320px",
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 10000,
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.4)",
          outline: "none",
          fontFamily: "inherit",
          fontSize: "13px",
          userSelect: "none",
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((subItem, sIdx) => {
          if (subItem.type === "separator") {
            return (
              <div
                key={`sub-sep-${sIdx}`}
                role="separator"
                style={{
                  height: "1px",
                  backgroundColor: "var(--line)",
                  margin: "4px 0",
                }}
              />
            );
          }

          if (subItem.type === "header") {
            return (
              <div
                key={`sub-head-${sIdx}`}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--mut)",
                  padding: "4px 10px 2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {subItem.label}
              </div>
            );
          }

          const isHovered = activeIndex === sIdx;

          return (
            <div
              key={subItem.id}
              role={
                subItem.checked !== undefined ? "menuitemcheckbox" : "menuitem"
              }
              aria-disabled={subItem.disabled ? "true" : "false"}
              title={subItem.disabled ? subItem.disabledReason : undefined}
              onClick={() => onSelect(subItem)}
              onMouseEnter={() => {
                onHoverItem(subItem.commandHint || null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "28px",
                padding: "0 10px",
                borderRadius: "4px",
                cursor: subItem.disabled ? "not-allowed" : "pointer",
                backgroundColor: isHovered
                  ? subItem.disabled
                    ? "transparent"
                    : "var(--bg3)"
                  : "transparent",
                color: subItem.disabled
                  ? "var(--mut)"
                  : subItem.danger
                  ? "var(--del)"
                  : "var(--tx)",
                fontSize: "13px",
                transition: "background-color 0.08s ease",
              }}
            >
              <span>{subItem.label}</span>
              {subItem.shortcut && (
                <span
                  className="mono"
                  style={{ fontSize: "11px", color: "var(--mut)" }}
                >
                  {subItem.shortcut}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

Submenu.displayName = "Submenu";
