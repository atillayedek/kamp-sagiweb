import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Topluluklar" };

export default function Page() {
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Topluluklar</h1>
      <EmptyState icon="users" title="Bu bölüm hazırlanıyor" description="Yakında burada olacak." />
    </main>
  );
}
