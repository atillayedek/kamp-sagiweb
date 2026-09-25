"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type FieldFrameProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  counter?: string;
  children: React.ReactNode;
};

function FieldFrame({ id, label, hint, error, required, counter, children }: FieldFrameProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold text-ink">
        {label}
        {required && <span className="font-normal text-ink-muted"> (zorunlu)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {children}
      <div className="flex items-start justify-between gap-3">
        {error ? (
          <p id={`${id}-error`} className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : (
          <span />
        )}
        {counter && (
          <p id={`${id}-counter`} className="text-sm tabular-nums text-ink-muted">
            {counter}
          </p>
        )}
      </div>
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string, counter?: boolean): string | undefined {
  const ids = [hint && `${id}-hint`, error && `${id}-error`, counter && `${id}-counter`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

const controlClasses =
  "w-full rounded-control border bg-surface px-3.5 text-base text-ink placeholder:text-ink-muted " +
  "disabled:cursor-not-allowed disabled:bg-sunken";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, required, className, ...props }: TextFieldProps) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, "min-h-11", error ? "border-danger" : "border-line-strong", className)}
        {...props}
      />
    </FieldFrame>
  );
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  maxLength?: number;
};

export function TextArea({ label, hint, error, required, maxLength, value, className, rows = 4, ...props }: TextAreaProps) {
  const id = useId();
  const counter = maxLength ? `${value.length}/${maxLength}` : undefined;
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} required={required} counter={counter}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error, Boolean(counter))}
        className={cn(controlClasses, "py-2.5 leading-relaxed", error ? "border-danger" : "border-line-strong", className)}
        {...props}
      />
    </FieldFrame>
  );
}
