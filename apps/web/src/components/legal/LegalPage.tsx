import type { ReactNode } from "react";
import { Banner } from "@/components/ui/Banner";

type LegalPageProps = {
  title: string;
  summary: string;
  children: ReactNode;
};

export function LegalPage({ title, summary, children }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8 space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-ink">Yasal metin · Taslak</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-lg text-ink-muted">{summary}</p>
        <Banner tone="warning" title="Bu metin taslaktır ve yürürlükte değildir.">
          Hukuki inceleme tamamlanmadan bağlayıcı değildir. Köşeli parantez içindeki alanlar hukuk danışmanı onayıyla
          doldurulacaktır.
        </Banner>
      </header>
      <div className="space-y-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-ink [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}

export function Pending({ children }: { children: ReactNode }) {
  return <span className="rounded bg-accent-soft px-1 font-medium text-accent-ink">[{children}]</span>;
}
