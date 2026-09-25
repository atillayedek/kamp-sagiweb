import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

type BadgeTone = "primary" | "accent" | "neutral" | "danger";

const tones: Record<BadgeTone, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent-ink",
  neutral: "bg-sunken text-ink-muted",
  danger: "bg-danger-soft text-danger",
};

type BadgeProps = {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone = "primary", icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} className="size-3.5" strokeWidth={2.25} />}
      {children}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge icon="shield-check" className={className}>
      Doğrulanmış öğrenci
    </Badge>
  );
}
