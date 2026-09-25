import Link from "next/link";
import { Wordmark } from "@/components/site/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="board-dots min-h-dvh bg-sunken">
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-primary"
      >
        İçeriğe geç
      </a>
      <header className="mx-auto flex h-16 max-w-xl items-center px-4">
        <Link href="/" className="rounded-control text-primary" aria-label="KampüsAğı ana sayfa">
          <Wordmark />
        </Link>
      </header>
      {children}
    </div>
  );
}
