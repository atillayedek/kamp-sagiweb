import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export type TagTone = "primary" | "accent" | "neutral";

const tones: Record<TagTone, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent-ink",
  neutral: "bg-sunken text-ink-muted",
};

export function Tag({ tone = "primary", children, className }: { tone?: TagTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-pill px-2.5 py-0.5 text-sm font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  selected: boolean;
};

export function Chip({ selected, children, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-4 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-line-strong bg-surface text-ink hover:bg-primary-soft",
        className,
      )}
      {...props}
    >
      {selected && <Icon name="check" className="size-4" />}
      {children}
    </button>
  );
}
