import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 5000;

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage;
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, variant, message }]);
      window.setTimeout(() => {
        dismiss(id);
      }, TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => pushToast('success', message),
      error: (message: string) => pushToast('error', message),
      info: (message: string) => pushToast('info', message),
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((t) => {
          const styles =
            t.variant === 'success'
              ? 'border-emerald-200 bg-white text-emerald-800 dark:border-emerald-500/30 dark:bg-[#181A1F] dark:text-emerald-300'
              : t.variant === 'error'
                ? 'border-rose-200 bg-white text-rose-800 dark:border-rose-500/30 dark:bg-[#181A1F] dark:text-rose-300'
                : 'border-blue-200 bg-white text-blue-800 dark:border-blue-500/30 dark:bg-[#181A1F] dark:text-blue-300';

          const Icon =
            t.variant === 'success'
              ? CheckCircle2
              : t.variant === 'error'
                ? AlertCircle
                : Info;

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto animate-fade-up flex items-start gap-2.5 rounded-xl border p-3.5 text-xs shadow-lg backdrop-blur-md ${styles}`}
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="flex-1 font-medium leading-relaxed">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
