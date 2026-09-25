import { cn } from "@/lib/cn";

type LogoTone = "default" | "inverted";

const toneColors: Record<LogoTone, { paper: string; lines: string }> = {
  default: { paper: "var(--color-primary)", lines: "var(--color-surface)" },
  inverted: { paper: "var(--color-surface)", lines: "var(--color-primary)" },
};

export function LogoMark({ tone = "default", className }: { tone?: LogoTone; className?: string }) {
  const colors = toneColors[tone];
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn("size-8 shrink-0", className)}>
      <path
        fill={colors.paper}
        d="M8 3h16a3 3 0 0 1 3 3v19l-2.75 2.5L21.5 25l-2.75 2.5L16 25l-2.75 2.5L10.5 25l-2.75 2.5L5 25V6a3 3 0 0 1 3-3z"
      />
      <path stroke={colors.lines} strokeLinecap="round" strokeWidth="2.2" d="M10.5 13h11M10.5 18h7" />
      <circle cx="16" cy="6.5" r="2.4" fill="var(--color-accent)" />
    </svg>
  );
}

export function Wordmark({ tone = "default", className }: { tone?: LogoTone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xl font-bold tracking-tight", className)}>
      <LogoMark tone={tone} />
      KampüsAğı
    </span>
  );
}
