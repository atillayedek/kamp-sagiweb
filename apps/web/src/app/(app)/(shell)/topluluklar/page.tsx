import type { Metadata } from "next";
import { CommunitiesPage } from "@/features/community/CommunitiesPage";
import { communityTabFrom } from "@/features/community/tabs";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "Topluluklar" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sekme } = await searchParams;
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Topluluklar</h1>
      <RequireVerified>
        <CommunitiesPage defaultTab={communityTabFrom(sekme)} />
      </RequireVerified>
    </main>
  );
}
