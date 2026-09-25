import Link from "next/link";
import { landingSections, legalPages } from "@/lib/site";
import { Wordmark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="on-dark bg-primary text-on-primary">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <Wordmark tone="inverted" />
          <p className="max-w-sm text-on-primary/85">Gerçek üniversite öğrencileri, gerçek kampüsler.</p>
        </div>
        <nav aria-label="Sayfa bölümleri">
          <p className="mb-3 font-semibold">Ürün</p>
          <ul className="space-y-1">
            {landingSections.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="inline-flex min-h-11 items-center rounded-control text-on-primary/85 underline-offset-4 hover:text-on-primary hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Yasal metinler">
          <p className="mb-3 font-semibold">Yasal</p>
          <ul className="space-y-1">
            {legalPages.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="inline-flex min-h-11 items-center gap-2 rounded-control text-on-primary/85 underline-offset-4 hover:text-on-primary hover:underline">
                  {page.title}
                  <span className="rounded-pill border border-on-primary/40 px-1.5 text-xs">taslak</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-on-primary/15">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-on-primary/85 sm:px-6">
          Yasal metinler taslaktır; hukuki inceleme tamamlanmadan yürürlüğe girmez. © {new Date().getFullYear()} KampüsAğı
        </p>
      </div>
    </footer>
  );
}
