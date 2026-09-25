import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "section" | "li";
};

export function Card({ as: Tag = "div", className, ...props }: CardProps) {
  return <Tag className={cn("rounded-card border border-line bg-surface shadow-card", className)} {...props} />;
}
