import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "Keşfet" };

export default function Page() {
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Keşfet</h1>
      <RequireVerified>
        <div className="flex flex-col gap-6">
          <Card as="section" aria-labelledby="need-cta" className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h2 id="need-cta" className="text-lg font-semibold text-ink">
                Bir ihtiyacın mı var?
              </h2>
              <p className="text-ink-muted">Birkaç cümleyle anlat; ilanını senin için hazırlayalım.</p>
            </div>
            <ButtonLink href="/kesfet/yeni">İhtiyacını yaz</ButtonLink>
          </Card>
          <EmptyState icon="compass" title="İlan akışı hazırlanıyor" description="Kampüsündeki ilanlar yakında burada olacak." />
        </div>
      </RequireVerified>
    </main>
  );
}
