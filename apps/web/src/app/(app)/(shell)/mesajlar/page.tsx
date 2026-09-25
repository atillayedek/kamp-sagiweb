import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/States";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "Mesajlar" };

export default function Page() {
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Mesajlar</h1>
      <RequireVerified>
        <EmptyState icon="chat" title="Bu bölüm hazırlanıyor" description="Yakında burada olacak." />
      </RequireVerified>
    </main>
  );
}
