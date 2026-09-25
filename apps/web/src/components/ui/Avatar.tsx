import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

type AvatarSize = "sm" | "md" | "lg";

const sizes: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
};

const palettes = ["bg-primary-soft text-primary", "bg-accent-soft text-accent-ink", "bg-sunken text-ink"];

function paletteFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return palettes[hash % palettes.length] as string;
}

type AvatarProps = {
  name: string;
  size?: AvatarSize;
  decorative?: boolean;
  className?: string;
};

export function Avatar({ name, size = "md", decorative = false, className }: AvatarProps) {
  const a11y = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name };
  return (
    <span
      {...a11y}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        sizes[size],
        paletteFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
