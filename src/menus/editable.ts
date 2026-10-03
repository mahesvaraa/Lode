import type { MenuItem } from "@/store/contextMenuStore";

export function buildEditableMenu(
  target: HTMLInputElement | HTMLTextAreaElement
): MenuItem[] {
  const hasSelection =
    typeof target.selectionStart === "number" &&
    typeof target.selectionEnd === "number" &&
    target.selectionStart !== target.selectionEnd;

  const isReadOnly = target.readOnly || target.disabled;

  return [
    {
      type: "item",
      id: "edit:undo",
      label: "Отменить",
      shortcut: "Ctrl+Z",
      run: () => {
        target.focus();
        document.execCommand("undo");
      },
    },
    {
      type: "item",
      id: "edit:redo",
      label: "Повторить",
      shortcut: "Ctrl+Y",
      run: () => {
        target.focus();
        document.execCommand("redo");
      },
    },
    { type: "separator" },
    {
      type: "item",
      id: "edit:cut",
      label: "Вырезать",
      shortcut: "Ctrl+X",
      disabled: !hasSelection || isReadOnly,
      disabledReason: !hasSelection ? "Ничего не выделено" : "Поле только для чтения",
      run: async () => {
        target.focus();
        const selStart = target.selectionStart || 0;
        const selEnd = target.selectionEnd || 0;
        const text = target.value.substring(selStart, selEnd);
        if (text) {
          await navigator.clipboard.writeText(text);
          if (!isReadOnly) {
            target.setRangeText("", selStart, selEnd, "end");
            target.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      },
    },
    {
      type: "item",
      id: "edit:copy",
      label: "Копировать",
      shortcut: "Ctrl+C",
      disabled: !hasSelection,
      disabledReason: "Ничего не выделено",
      run: async () => {
        target.focus();
        const selStart = target.selectionStart || 0;
        const selEnd = target.selectionEnd || 0;
        const text = target.value.substring(selStart, selEnd);
        if (text) {
          await navigator.clipboard.writeText(text);
        }
      },
    },
    {
      type: "item",
      id: "edit:paste",
      label: "Вставить",
      shortcut: "Ctrl+V",
      disabled: isReadOnly,
      disabledReason: "Поле только для чтения",
      run: async () => {
        target.focus();
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            const selStart = target.selectionStart || 0;
            const selEnd = target.selectionEnd || 0;
            target.setRangeText(text, selStart, selEnd, "end");
            target.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } catch (err) {
          console.error("Paste failed:", err);
        }
      },
    },
    { type: "separator" },
    {
      type: "item",
      id: "edit:select-all",
      label: "Выделить всё",
      shortcut: "Ctrl+A",
      disabled: !target.value,
      run: () => {
        target.focus();
        target.select();
      },
    },
  ];
}
