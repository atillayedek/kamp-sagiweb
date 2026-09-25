import type { Metadata } from "next";
import Link from "next/link";
import { ClubForm } from "@/features/community/CreateForms";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "Kulüp kur" };

export default function Page() {
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Konum" className="mb-2 text-sm">
        <Link href="/topluluklar?sekme=kulupler" className="font-semibold text-primary underline underline-offset-2">
          Kulüpler
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Kulüp kur</h1>
      <p className="mb-6 text-ink-muted">Kulübün doğrulanmış öğrencilere görünür; kurucu olarak otomatik üye olursun.</p>
      <RequireVerified>
        <ClubForm />
      </RequireVerified>
    </main>
  );
}
