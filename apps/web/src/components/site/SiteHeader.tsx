import Link from "next/link";
import { landingSections } from "@/lib/site";
import { Wordmark } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-primary focus:shadow-lifted"
      >
        İçeriğe geç
      </a>
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-control text-primary" aria-label="KampüsAğı ana sayfa">
          <Wordmark />
        </Link>
        <nav aria-label="Ana menü" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {landingSections.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-control px-3 font-medium text-ink-muted transition-colors hover:bg-primary-soft hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <MobileMenu links={landingSections} />
      </div>
    </header>
  );
}
