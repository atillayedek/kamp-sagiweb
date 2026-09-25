"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: "center" | "sheet";
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, description, variant = "center", children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    openRef.current = open;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className={cn(
        "bg-surface p-0 text-ink shadow-lifted backdrop:bg-ink/45",
        variant === "sheet"
          ? "mb-0 mt-auto w-full max-w-none rounded-t-card sm:m-auto sm:max-w-lg sm:rounded-card"
          : "m-auto w-[calc(100%-2rem)] max-w-lg rounded-card",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-3 pt-4">
        <div className="space-y-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-sm text-ink-muted">
              {description}
            </p>
          )}
        </div>
        <IconButton icon="x" label="Kapat" onClick={() => ref.current?.close()} className="-mr-2 -mt-1" />
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  );
}
