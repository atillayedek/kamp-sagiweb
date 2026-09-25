"use client";

import Link from "next/link";
import { Wordmark } from "@/components/site/Logo";
import { VerificationQueue } from "@/features/admin/VerificationQueue";
import { RequireModerator } from "@/features/app/guards";

export default function AdminPage() {
  return (
    <RequireModerator>
      {(session) => (
        <div className="min-h-dvh bg-bg">
          <header className="border-b border-line bg-bg">
            <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
              <span className="flex items-center gap-3 text-primary">
                <Wordmark />
                <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">Moderatör</span>
              </span>
              <Link href="/profil" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
                Uygulamaya dön
              </Link>
            </div>
          </header>
          <main id="icerik" className="mx-auto max-w-4xl space-y-6 px-4 py-8">
            <h1 className="text-2xl font-bold tracking-tight">Moderatör paneli</h1>
            <VerificationQueue moderatorUid={session.user.uid} />
          </main>
        </div>
      )}
    </RequireModerator>
  );
}
