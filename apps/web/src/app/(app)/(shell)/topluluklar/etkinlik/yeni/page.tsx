import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/features/community/CreateForms";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "Etkinlik oluştur" };

export default function Page() {
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Konum" className="mb-2 text-sm">
        <Link href="/topluluklar?sekme=etkinlikler" className="font-semibold text-primary underline underline-offset-2">
          Etkinlikler
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Etkinlik oluştur</h1>
      <p className="mb-6 text-ink-muted">Zamanlar Türkiye saatine göredir. Etkinlik başladıktan sonra yeni katılım alınmaz.</p>
      <RequireVerified>
        <EventForm />
      </RequireVerified>
    </main>
  );
}
