import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionProps = {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  tone?: "plain" | "sunken" | "dark";
  children: ReactNode;
};

const tones = {
  plain: "bg-bg",
  sunken: "bg-sunken",
  dark: "on-dark bg-primary text-on-primary",
};

export function Section({ id, eyebrow, title, lead, tone = "plain", children }: SectionProps) {
  const dark = tone === "dark";
  return (
    <section id={id} aria-labelledby={`${id}-baslik`} className={cn("scroll-mt-16 py-16 sm:py-24", tones[tone])}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl space-y-3">
          {eyebrow && (
            <p className={cn("text-sm font-semibold uppercase tracking-wider", dark ? "text-on-primary/85" : "text-accent-ink")}>
              {eyebrow}
            </p>
          )}
          <h2 id={`${id}-baslik`} className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h2>
          {lead && <div className={cn("text-lg", dark ? "text-on-primary/85" : "text-ink-muted")}>{lead}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
