import type { Metadata } from "next";
import Link from "next/link";
import { PostDetail } from "@/features/community/PostDetail";
import { RequireVerified } from "@/features/verification/RequireVerified";

export const metadata: Metadata = { title: "Gönderi" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main id="icerik" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Konum" className="mb-2 text-sm">
        <Link href="/topluluklar" className="font-semibold text-primary underline underline-offset-2">
          Topluluklar
        </Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Gönderi</h1>
      <RequireVerified>
        <PostDetail postId={id} />
      </RequireVerified>
    </main>
  );
}
