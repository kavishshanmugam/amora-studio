import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const focusableSelector = [
  "button:not([disabled])", "[href]", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

function useAccessibleDialog(open: boolean, dialogRef: React.RefObject<HTMLDivElement | null>, initialRef: React.RefObject<HTMLElement | null>, onCancel: () => void) {
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const hidden: Array<{ element: HTMLElement; inert: boolean; ariaHidden: string | null }> = [];
    for (const child of Array.from(document.body.children)) {
      if (child === dialog || !(child instanceof HTMLElement)) continue;
      hidden.push({ element: child, inert: child.inert, ariaHidden: child.getAttribute("aria-hidden") });
      child.inert = true;
      child.setAttribute("aria-hidden", "true");
    }

    initialRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      for (const item of hidden) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
      openerRef.current?.focus();
    };
  }, [dialogRef, initialRef, onCancel, open]);
}

export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useAccessibleDialog(open, dialogRef, cancelRef, onCancel);
  if (!open) return null;

  return createPortal(
    <div
      ref={dialogRef}
      role={danger ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={message ? descriptionId : undefined}
      tabIndex={-1}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-[360px] p-5">
        <h2 id={titleId} className="text-sm font-medium mb-2">{title}</h2>
        {message && <p id={descriptionId} className="text-sm text-text-secondary mb-4">{message}</p>}
        <div className="flex gap-2 justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel}
            className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg transition-colors">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm}
            className={`text-sm py-2 px-4 rounded-lg text-white transition-colors font-medium ${
              danger ? "bg-danger hover:bg-danger/90" : "bg-brand hover:bg-brand/90"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface PromptDialogProps {
  open: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  open, title, placeholder, defaultValue = "", onSubmit, onCancel,
}: PromptDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const inputId = useId();
  useAccessibleDialog(open, dialogRef, inputRef, onCancel);
  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = inputRef.current?.value.trim() ?? "";
    if (value) onSubmit(value);
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div className="bg-surface rounded-xl border border-border shadow-xl w-full max-w-[360px] p-5">
        <h2 id={titleId} className="text-sm font-medium mb-3">{title}</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor={inputId} className="sr-only">{title}</label>
          <input id={inputId} ref={inputRef} defaultValue={defaultValue} placeholder={placeholder}
            className="w-full text-sm px-3 py-2 border border-border rounded-lg outline-none focus:border-brand bg-surface mb-4" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel}
              className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="text-sm py-2 px-4 rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors font-medium">
              OK
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
