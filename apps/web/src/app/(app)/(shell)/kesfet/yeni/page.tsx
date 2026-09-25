import type { Metadata } from "next";
import Link from "next/link";
import { NeedComposer } from "@/features/needs/NeedComposer";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "İhtiyacını yaz" };

export default function Page() {
  return (
    <main id="icerik" className="mx-auto max-w-5xl px-4 py-8">
      <nav aria-label="Konum" className="mb-2 text-sm">
        <Link href="/kesfet" className="font-semibold text-primary underline underline-offset-2">
          Keşfet
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">İhtiyacını yaz</h1>
      <RequireVerified>
        <NeedComposer />
      </RequireVerified>
    </main>
  );
}
