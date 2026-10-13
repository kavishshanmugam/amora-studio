import { useEffect, useRef } from "react";

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

export function ConfirmDialog({
  open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-surface rounded-xl border border-border shadow-xl w-[360px] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        {message && <p className="text-sm text-text-secondary mb-4">{message}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel}
            className="text-sm py-2 px-4 rounded-lg border border-border hover:bg-bg transition-colors">
            {cancelLabel}
          </button>
          <button ref={confirmRef} onClick={onConfirm}
            className={`text-sm py-2 px-4 rounded-lg text-white transition-colors font-medium ${
              danger ? "bg-danger hover:bg-danger/90" : "bg-brand hover:bg-brand/90"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value ?? "";
    if (val.trim()) onSubmit(val.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-surface rounded-xl border border-border shadow-xl w-[360px] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input ref={inputRef} defaultValue={defaultValue} placeholder={placeholder}
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
    </div>
  );
}
