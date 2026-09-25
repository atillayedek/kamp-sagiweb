"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import { toAppError } from "@/connectors/errors";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { useSignedIn } from "@/features/app/guards";
import { ProfileEditForm } from "./ProfileEditForm";
import { useUniversities } from "./useUniversities";
import { VerificationBanner } from "./VerificationBanner";

function TagSection({ title, tags, empty }: { title: string; tags: string[]; empty: string }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <Tag>{tag}</Tag>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">{empty}</p>
      )}
    </section>
  );
}

export function ProfilePage() {
  const { session, profile } = useSignedIn();
  const { auth } = useConnectors();
  const router = useRouter();
  const toast = useToast();
  const universities = useUniversities();
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const universityName =
    universities.status === "ready"
      ? (universities.universities.find((u) => u.id === profile.universityId)?.name ?? profile.universityId)
      : null;

  async function signOut() {
    setSigningOut(true);
    try {
      await auth.signOut();
      router.replace("/giris");
    } catch (error) {
      setSigningOut(false);
      toast.show({ title: "Çıkış yapılamadı", description: toAppError(error).message, tone: "danger" });
    }
  }

  return (
    <main id="icerik" className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="sr-only">Profil</h1>
      <VerificationBanner status={profile.verificationStatus} />
      {!session.user.emailVerified && (
        <Banner tone="info" title="E-posta adresini doğrula">
          {session.user.email} adresine gönderdiğimiz bağlantıya tıklayarak e-postanı doğrulayabilirsin.
        </Banner>
      )}
      <Card className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar name={profile.displayName} size="lg" decorative />
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight">{profile.displayName}</p>
              <p className="text-ink-muted">
                {profile.department}
                {universityName && (
                  <>
                    <span className="sr-only">, </span>
                    <span aria-hidden="true" className="hidden sm:inline">
                      {" · "}
                    </span>
                    <span className="block sm:inline">{universityName}</span>
                  </>
                )}
              </p>
              {profile.verificationStatus === "verified" && <VerifiedBadge className="mt-2" />}
            </div>
          </div>
          {!editing && (
            <Button variant="secondary" onClick={() => setEditing(true)} className="w-full sm:w-auto">
              Profili düzenle
            </Button>
          )}
        </div>
        {editing ? (
          <ProfileEditForm profile={profile} onDone={() => setEditing(false)} />
        ) : (
          <div className="space-y-5">
            <TagSection title="İlgi alanları" tags={profile.interests} empty="Henüz ilgi alanı eklemedin." />
            <TagSection title="Beceriler" tags={profile.skills} empty="Henüz beceri eklemedin." />
            <section className="space-y-2">
              <h2 className="font-semibold">Hakkında</h2>
              <p className={profile.bio ? "text-ink" : "text-ink-muted"}>{profile.bio || "Henüz bir tanıtım yazmadın."}</p>
            </section>
          </div>
        )}
      </Card>
      {session.claims.moderator === true && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="font-semibold">Moderatör yetkin var.</p>
          <ButtonLink href="/admin" variant="secondary">
            Moderatör paneli
          </ButtonLink>
        </Card>
      )}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-ink-muted">{session.user.email}</p>
        <Button variant="ghost" onClick={signOut} disabled={signingOut}>
          {signingOut ? "Çıkış yapılıyor…" : "Çıkış yap"}
        </Button>
      </Card>
    </main>
  );
}
