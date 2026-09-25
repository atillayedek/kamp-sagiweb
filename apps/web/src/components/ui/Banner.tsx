import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type BannerTone = "info" | "warning" | "danger" | "success";

const tones: Record<BannerTone, { box: string; icon: IconName; iconColor: string }> = {
  info: { box: "border-primary bg-primary-soft", icon: "info", iconColor: "text-primary" },
  warning: { box: "border-accent bg-accent-soft", icon: "clock", iconColor: "text-accent-ink" },
  danger: { box: "border-danger bg-danger-soft", icon: "alert", iconColor: "text-danger" },
  success: { box: "border-primary bg-primary-soft", icon: "shield-check", iconColor: "text-primary" },
};

type BannerProps = {
  tone?: BannerTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  live?: boolean;
  className?: string;
};

export function Banner({ tone = "info", title, children, action, live = false, className }: BannerProps) {
  const style = tones[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={cn("flex flex-col gap-3 rounded-card border-l-4 p-4 sm:flex-row sm:items-start", style.box, className)}
    >
      <Icon name={style.icon} className={cn("mt-0.5 size-5", style.iconColor)} />
      <div className="flex-1 space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        {children && <div className="text-sm text-ink">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
