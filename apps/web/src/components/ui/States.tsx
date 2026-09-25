import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

type StateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon = "compass", title, description, action, className }: StateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center", className)}>
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} className="size-6" />
      </span>
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description && <p className="max-w-prose text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ icon = "alert", title, description, action, className }: StateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-card border border-danger bg-danger-soft px-6 py-10 text-center", className)}>
      <Icon name={icon} className="size-7 text-danger" />
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description && <p className="max-w-prose text-ink">{description}</p>}
      {action}
    </div>
  );
}
