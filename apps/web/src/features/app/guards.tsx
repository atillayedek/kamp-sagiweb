"use client";

import type { PublicProfile } from "@kampusagi/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import type { Session } from "@/connectors/types";
import { useOwnProfile } from "@/features/profile/useOwnProfile";
import { useSession } from "@/features/session/SessionProvider";
import { safeNextPath, signInPath } from "@/lib/redirect";
import { FullPageLoading } from "./FullPageLoading";

type SignedInContextValue = { session: Session; profile: PublicProfile };

const SignedInContext = createContext<SignedInContextValue | null>(null);

export function useSignedIn(): SignedInContextValue {
  const value = useContext(SignedInContext);
  if (!value) throw new Error("useSignedIn yalnızca RequireProfile içinde kullanılabilir.");
  return value;
}

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <FullPageLoading label="Yönlendiriliyor…" />;
}

export function onboardingPath(next: string | null): string {
  return next ? `/baslangic?next=${encodeURIComponent(safeNextPath(next))}` : "/baslangic";
}

export function RedirectIfSignedIn({ toOnboarding = false, children }: { toOnboarding?: boolean; children: ReactNode }) {
  const session = useSession();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  if (session.status === "loading") return <FullPageLoading />;
  if (session.status === "signed-in") return <Redirect to={toOnboarding ? onboardingPath(next) : safeNextPath(next)} />;
  return children;
}

export function RequireModerator({ children }: { children: (session: Session) => ReactNode }) {
  return (
    <RequireSession>
      {(session) =>
        session.claims.moderator === true ? (
          children(session)
        ) : (
          <main id="icerik" className="mx-auto max-w-lg px-4 py-16">
            <ErrorState
              icon="lock"
              title="Bu sayfaya erişim yetkin yok"
              description="Moderatör paneli yalnızca yetkili moderatörlere açıktır."
            />
          </main>
        )
      }
    </RequireSession>
  );
}

export function RequireSession({ children }: { children: (session: Session) => ReactNode }) {
  const session = useSession();
  const pathname = usePathname();
  if (session.status === "loading") return <FullPageLoading />;
  if (session.status === "signed-out") return <Redirect to={signInPath(pathname)} />;
  return children(session.session);
}

export function RequireProfile({ children }: { children: ReactNode }) {
  return <RequireSession>{(session) => <ProfileGate session={session}>{children}</ProfileGate>}</RequireSession>;
}

function useClaimsSync(session: Session, verificationStatus: string | null) {
  const { refresh } = useSession();
  const { functions } = useConnectors();
  const attempted = useRef<string | null>(null);
  const claimsVerified = session.claims.verified === true;
  const outOfSync = verificationStatus !== null && (verificationStatus === "verified") !== claimsVerified;

  useEffect(() => {
    if (!outOfSync || attempted.current === verificationStatus) return;
    attempted.current = verificationStatus;
    functions
      .call("syncVerificationClaims", {})
      .catch(() => undefined)
      .then(() => refresh())
      .catch(() => undefined);
  }, [functions, outOfSync, refresh, verificationStatus]);
}

function ProfileGate({ session, children }: { session: Session; children: ReactNode }) {
  const profile = useOwnProfile(session.user.uid);
  const pathname = usePathname();
  useClaimsSync(session, profile.status === "ready" ? profile.profile.verificationStatus : null);
  if (profile.status === "loading") return <FullPageLoading label="Profilin yükleniyor…" />;
  if (profile.status === "missing") return <Redirect to={onboardingPath(pathname)} />;
  if (profile.status === "error") {
    return (
      <main id="icerik" className="mx-auto max-w-lg px-4 py-16">
        <ErrorState
          title="Profilin yüklenemedi"
          description={profile.error.message}
          action={<Button onClick={() => window.location.reload()}>Tekrar dene</Button>}
        />
      </main>
    );
  }
  return <SignedInContext.Provider value={{ session, profile: profile.profile }}>{children}</SignedInContext.Provider>;
}
