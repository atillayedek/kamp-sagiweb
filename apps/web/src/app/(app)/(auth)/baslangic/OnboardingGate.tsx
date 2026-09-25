"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoading } from "@/features/app/FullPageLoading";
import { RequireSession } from "@/features/app/guards";
import { AuthCard } from "@/features/auth/AuthCard";
import { OnboardingForm } from "@/features/profile/OnboardingForm";
import { useOwnProfile } from "@/features/profile/useOwnProfile";
import { safeNextPath } from "@/lib/redirect";

function Onboarding({ uid }: { uid: string }) {
  const profile = useOwnProfile(uid);
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const exists = profile.status === "ready";

  useEffect(() => {
    if (exists) router.replace(next);
  }, [exists, next, router]);

  if (profile.status === "loading" || exists) return <FullPageLoading />;
  return (
    <AuthCard
      width="wide"
      title="Profilini oluştur"
      description="Bu bilgiler eşleşmelerde ve kampüs topluluğunda görünür. İstediğin zaman değiştirebilirsin; üniversiteni ise değiştiremezsin."
    >
      <OnboardingForm />
    </AuthCard>
  );
}

export function OnboardingGate() {
  return <RequireSession>{(session) => <Onboarding uid={session.user.uid} />}</RequireSession>;
}
