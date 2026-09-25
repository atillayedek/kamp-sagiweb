"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type RadioOption<T extends string> = { value: T; label: string; description?: string };

type RadioGroupProps<T extends string> = {
  legend: string;
  value: T;
  options: ReadonlyArray<RadioOption<T>>;
  onChange: (value: T) => void;
  className?: string;
};

export function RadioGroup<T extends string>({ legend, value, options, onChange, className }: RadioGroupProps<T>) {
  const name = useId();
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="mb-1.5 font-semibold text-ink">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-control border bg-surface p-3.5",
                checked ? "border-primary bg-primary-soft" : "border-line-strong hover:bg-sunken",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                aria-describedby={option.description ? `${id}-description` : undefined}
                onChange={() => onChange(option.value)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-ink">{option.label}</span>
                {option.description && (
                  <span id={`${id}-description`} className="text-sm text-ink-muted">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
