import type { Metadata } from "next";
import { DiscoverPage } from "@/features/discover/DiscoverPage";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "Keşfet" };

export default function Page() {
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Keşfet</h1>
      <RequireVerified>
        <DiscoverPage />
      </RequireVerified>
    </main>
  );
}
