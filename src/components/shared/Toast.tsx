import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ToastItemData {
  id: number;
  message: string;
  onUndo?: () => void;
  duration: number;
}

interface ToastContextType {
  show: (message: string, opts?: { onUndo?: () => void; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const show = useCallback((message: string, opts?: { onUndo?: () => void; duration?: number }) => {
    const duration = opts?.duration ?? (opts?.onUndo ? 0 : 5000);
    setToasts((current) => [...current, { id: nextId++, message, onUndo: opts?.onUndo, duration }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-label="Notifications" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, dismiss }: { toast: ToastItemData; dismiss: (id: number) => void }) {
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const startTimer = useCallback(() => {
    clearTimer();
    if (remaining.current <= 0) return;
    startedAt.current = performance.now();
    timer.current = setTimeout(() => dismiss(toast.id), remaining.current);
  }, [clearTimer, dismiss, toast.id]);
  const pauseTimer = useCallback(() => {
    if (timer.current === null) return;
    remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
    clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [clearTimer, startTimer]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onPointerEnter={pauseTimer}
      onPointerLeave={startTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) startTimer();
      }}
      className="pointer-events-auto bg-text-primary text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 text-sm animate-slide-up min-w-0 sm:min-w-[280px]"
    >
      <span className="flex-1">{toast.message}</span>
      {toast.onUndo && (
        <button type="button" onClick={() => { toast.onUndo?.(); dismiss(toast.id); }} className="text-white font-semibold underline underline-offset-2 shrink-0">Undo</button>
      )}
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="text-white shrink-0 px-1">✕</button>
    </div>
  );
}
