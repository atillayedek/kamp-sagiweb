"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  label: ReactNode;
  error?: string;
};

export function CheckboxField({ label, error, className, ...props }: CheckboxFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("mt-0.5 size-6 shrink-0 cursor-pointer rounded accent-primary", className)}
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-ink">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="pl-9 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
