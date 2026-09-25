import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type StyleOptions = {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-line-strong bg-surface text-primary hover:bg-primary-soft",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  danger: "border border-danger bg-surface text-danger hover:bg-danger-soft",
};

export function buttonClasses({ variant = "primary", fullWidth = false }: StyleOptions = {}): string {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 text-base font-semibold",
    "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    fullWidth && "w-full",
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleOptions;

export function Button({ variant, fullWidth, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses({ variant, fullWidth }), className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleOptions;

export function ButtonLink({ variant, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses({ variant, fullWidth }), className)} {...props} />;
}
