"use client";

import { matchSchema, publicProfileSchema, type Match, type PublicProfile } from "@kampusagi/contracts";
import { useEffect, useState } from "react";
import { MatchCard } from "@/components/need/MatchCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";

type MatchView = { id: string; match: Match; profile: PublicProfile | null };

type MatchesState = { status: "loading" } | { status: "ready"; items: MatchView[] } | { status: "error"; message: string };

type NeedMatchesProps = {
  needId: string;
  needStatus: "open" | "closed";
  matchStatus?: "pending" | "done" | "failed";
  matchCount?: number;
};

function MatchSkeleton() {
  return (
    <LoadingRegion label="Eşleşmeler hazırlanıyor…">
      <Card className="flex flex-col gap-3 p-5">
        <p className="font-semibold text-ink">Eşleşmeler hazırlanıyor…</p>
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    </LoadingRegion>
  );
}

function MatchItem({ path, view, onDismissed }: { path: string; view: MatchView; onDismissed: () => void }) {
  const { writer } = useConnectors();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    try {
      await writer.updateFields(path, { status: "dismissed" });
      toast.show({ title: "Eşleşme gizlendi", tone: "success" });
      onDismissed();
    } catch (error) {
      toast.show({ title: "Eşleşme gizlenemedi", description: toAppError(error).message, tone: "danger" });
      setBusy(false);
    }
  }

  return (
    <MatchCard
      match={{
        name: view.profile?.displayName ?? "Öğrenci",
        department: view.profile?.department ?? "Profil bilgisi alınamadı",
        verified: view.profile?.verificationStatus === "verified",
        score: view.match.score,
        reasons: view.match.reasons,
      }}
      footer={
        <Button variant="ghost" onClick={dismiss} disabled={busy}>
          Gizle
        </Button>
      }
    />
  );
}

export function NeedMatches({ needId, needStatus, matchStatus, matchCount }: NeedMatchesProps) {
  const { documents } = useConnectors();
  const [state, setState] = useState<MatchesState>({ status: "loading" });
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const ready = matchStatus === "done";

  useEffect(() => {
    if (!ready) return;
    let active = true;
    (async () => {
      const matches = await documents.queryCollection(
        `needs/${needId}/matches`,
        { where: [["status", "==", "suggested"]], orderBy: ["score", "desc"], limit: 50 },
        matchSchema,
      );
      const profiles = await Promise.allSettled(
        matches.map((item) => documents.getDocument(`users/${item.data.candidateUid}`, publicProfileSchema)),
      );
      return matches.map((item, index) => {
        const profile = profiles[index]!;
        return { id: item.id, match: item.data, profile: profile.status === "fulfilled" ? profile.value : null };
      });
    })().then(
      (items) => active && setState({ status: "ready", items }),
      (error) => active && setState({ status: "error", message: toAppError(error).message }),
    );
    return () => {
      active = false;
    };
  }, [documents, needId, ready, matchCount]);

  if (matchStatus === "failed") {
    return <ErrorState title="Eşleşmeler hesaplanamadı" description="Bu ilan için eşleşme önerisi üretilemedi." />;
  }
  if (!ready && (needStatus === "closed" || matchStatus === undefined)) {
    return <EmptyState icon="users" title="Bu ilan için eşleşme aranmadı" />;
  }
  if (!ready || state.status === "loading") return <MatchSkeleton />;
  if (state.status === "error") return <ErrorState title="Eşleşmeler yüklenemedi" description={state.message} />;

  const visible = state.items.filter((item) => !hidden.has(item.id));
  if (visible.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="Şimdilik uygun öğrenci bulunamadı"
        description="Kampüsünde bu ilanın ilgi alanları ve becerileriyle eşleşen başka doğrulanmış öğrenci yok."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {visible.map((item) => (
        <li key={item.id}>
          <MatchItem
            path={`needs/${needId}/matches/${item.id}`}
            view={item}
            onDismissed={() => setHidden((current) => new Set(current).add(item.id))}
          />
        </li>
      ))}
    </ul>
  );
}
