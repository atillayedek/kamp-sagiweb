"use client";

import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { useSignedIn } from "@/features/app/guards";

const lockText = {
  unverified: "Bu bölümü görmek için öğrenci belgeni yüklemelisin.",
  pending: "Belgen inceleniyor. Onaylandığında bu bölüm açılacak.",
  rejected: "Belgen onaylanmadı. Yeni bir belge yükleyerek tekrar başvurabilirsin.",
  verified: "Doğrulaman tamamlanıyor, sayfayı yenilemen gerekebilir.",
} as const;

export function RequireVerified({ children }: { children: ReactNode }) {
  const { session, profile } = useSignedIn();
  if (session.claims.verified === true && profile.verificationStatus === "verified") return children;
  return (
    <EmptyState
      icon="lock"
      title="Öğrenci doğrulaması gerekli"
      description={lockText[profile.verificationStatus]}
      action={
        profile.verificationStatus === "pending" ? undefined : <ButtonLink href="/dogrulama">Doğrulama sayfasına git</ButtonLink>
      }
    />
  );
}
