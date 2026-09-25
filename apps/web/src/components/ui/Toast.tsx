"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

type ToastTone = "success" | "info" | "danger";

type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  show: (toast: Omit<ToastMessage, "id" | "tone"> & { tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 6000;

const toneStyles: Record<ToastTone, { icon: "check" | "info" | "alert"; className: string }> = {
  success: { icon: "check", className: "text-primary" },
  info: { icon: "info", className: "text-primary" },
  danger: { icon: "alert", className: "text-danger" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    ({ tone = "info", ...toast }) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, ...toast }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end"
      >
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface p-3 pl-4 shadow-lifted"
            >
              <Icon name={style.icon} className={cn("mt-0.5", style.className)} />
              <div className="flex-1">
                <p className="font-semibold text-ink">{toast.title}</p>
                {toast.description && <p className="text-sm text-ink-muted">{toast.description}</p>}
              </div>
              <IconButton icon="x" label="Bildirimi kapat" onClick={() => dismiss(toast.id)} className="-my-1.5" />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast yalnızca ToastProvider içinde kullanılabilir.");
  return context;
}
