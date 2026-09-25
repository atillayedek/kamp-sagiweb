import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  icon: IconName;
  label: string;
};

export function IconButton({ icon, label, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-control text-ink-muted transition-colors",
        "hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
