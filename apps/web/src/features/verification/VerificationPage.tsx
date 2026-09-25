"use client";

import { userPrivateSchema } from "@kampusagi/contracts";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSignedIn } from "@/features/app/guards";
import { useDocument } from "@/features/data/useDocument";
import { rejectReasonLabels } from "./labels";
import { VerificationUpload } from "./VerificationUpload";

export function VerificationPage() {
  const { session, profile } = useSignedIn();
  const privateDoc = useDocument(`userPrivate/${session.user.uid}`, userPrivateSchema);
  const verification = privateDoc.status === "ready" ? privateDoc.data.verification : undefined;
  const status = profile.verificationStatus;

  return (
    <main id="icerik" className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Öğrenci doğrulaması</h1>
        <p className="text-ink-muted">
          KampüsAğı&apos;nda herkes gerçek bir üniversite öğrencisi. Doğrulama tamamlanınca kampüs içeriği ve eşleşmeler açılır.
        </p>
      </div>

      {status === "verified" && (
        <Banner tone="success" title="Doğrulandın" action={<ButtonLink href="/kesfet">Keşfet&apos;e git</ButtonLink>}>
          Öğrenci belgen onaylandı. Kampüs içeriğine ve eşleşmelere erişebilirsin.
        </Banner>
      )}

      {status === "pending" && (
        <Banner tone="warning" title="Belgen inceleniyor">
          Bir moderatör belgeni inceleyecek. Sonuç bu sayfada ve profilinde görünecek.
        </Banner>
      )}

      {status === "rejected" && (
        <Banner tone="danger" title="Belgen onaylanmadı">
          {privateDoc.status === "loading" ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <>
              {verification?.rejectReason && <p>Sebep: {rejectReasonLabels[verification.rejectReason]}</p>}
              {verification?.note && <p>Moderatör notu: {verification.note}</p>}
              <p className="mt-1">Aşağıdan yeni bir belge yükleyebilirsin.</p>
            </>
          )}
        </Banner>
      )}

      {(status === "unverified" || status === "rejected") && (
        <Card className="space-y-5 p-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Belgeni yükle</h2>
            <ol className="list-decimal space-y-1 pl-5 text-ink">
              <li>e-Devlet&apos;ten öğrenci belgeni PDF olarak indir.</li>
              <li>Dosyayı değiştirmeden buraya yükle (en fazla 5 MB).</li>
              <li>Moderatör incelemesini bekle.</li>
            </ol>
          </div>
          <VerificationUpload uid={session.user.uid} />
          <p className="text-sm text-ink-muted">
            Belgeni yalnızca sen ve inceleyen moderatör görebilir. Karar verildikten sonra saklama süresi (taslak: 30 gün)
            dolunca silinir.
          </p>
        </Card>
      )}
    </main>
  );
}
