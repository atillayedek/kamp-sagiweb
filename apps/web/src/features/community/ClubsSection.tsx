"use client";

import { clubSchema, type Club } from "@kampusagi/contracts";
import { useCallback, useId, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import type { QueryOptions } from "@/connectors/types";
import { adjustCount, countLabel, visibilityBadges } from "./labels";
import { PagedList, type PageLoader } from "./PagedList";
import { usePresence } from "./presence";
import { ReportButton } from "./ReportButton";

const PAGE_SIZE = 20;

export function ClubsSection({ uid, universityId }: { uid: string; universityId: string }) {
  const { documents } = useConnectors();

  const loader = useCallback(
    (where: QueryOptions["where"]): PageLoader<Club> =>
      (after) => documents.queryPage("clubs", { where, orderBy: ["createdAt", "desc"], limit: PAGE_SIZE, after }, clubSchema),
    [documents],
  );
  const loaders = useMemo(
    () => ({ campus: loader([["universityId", "==", universityId]]), global: loader([["visibility", "==", "global"]]) }),
    [loader, universityId],
  );
  const renderClub = useCallback((item: { id: string; data: Club }) => <ClubCard id={item.id} club={item.data} uid={uid} />, [uid]);

  const list = (load: PageLoader<Club>, empty: { title: string; description: string }) => (
    <PagedList load={load} renderItem={renderClub} label="Kulüpler" noun="kulüp" empty={empty} errorTitle="Kulüpler yüklenemedi" />
  );

  return (
    <section aria-labelledby="clubs" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="clubs" className="text-xl font-bold text-ink">
          Kulüpler
        </h2>
        <ButtonLink href="/topluluklar/kulup/yeni">Kulüp kur</ButtonLink>
      </div>
      <Tabs
        label="Kulüp listesi"
        lazy
        keepMounted
        items={[
          {
            id: "kampus",
            label: "Kampüsüm",
            content: list(loaders.campus, { title: "Kampüsünde henüz kulüp yok", description: "İlk kulübü sen kurabilirsin." }),
          },
          {
            id: "genel",
            label: "Tüm üniversiteler",
            content: list(loaders.global, {
              title: "Henüz tüm üniversitelere açık kulüp yok",
              description: "Genel görünürlüklü kulüpler burada listelenir.",
            }),
          },
        ]}
      />
    </section>
  );
}

function ClubCard({ id, club, uid }: { id: string; club: Club; uid: string }) {
  const titleId = useId();
  const membership = usePresence(`clubs/${id}/members/${uid}`, "joinedAt", {
    on: `${club.name} kulübüne katıldın`,
    off: `${club.name} kulübünden ayrıldın`,
    failed: "Üyelik güncellenemedi",
  });
  const state = membership.state;
  const member = state.status === "ready" && state.on;
  const busy = state.status !== "ready" || state.busy;
  const visibility = visibilityBadges[club.visibility];

  return (
    <Card as="article" aria-labelledby={titleId} className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral" icon={visibility.icon}>
          {visibility.label}
        </Badge>
        {club.founderUid === uid && <Badge tone="accent">Kurucusun</Badge>}
        {member && <Badge icon="check">Üyesin</Badge>}
      </div>
      <h3 id={titleId} className="text-lg font-semibold leading-snug text-ink">
        {club.name}
      </h3>
      <p className="whitespace-pre-line break-words text-ink">{club.description}</p>
      <p className="text-sm text-ink-muted">{countLabel(adjustCount(club.memberCount, state), "üye")}</p>
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {state.status === "error" ? (
          <p className="text-sm text-danger">Üyelik durumu yüklenemedi.</p>
        ) : (
          <Button
            variant={member ? "secondary" : "primary"}
            aria-disabled={busy || undefined}
            aria-label={`${member ? "Ayrıl" : "Katıl"}: ${club.name}`}
            onClick={() => void membership.toggle()}
          >
            {member ? "Ayrıl" : "Katıl"}
          </Button>
        )}
        {club.founderUid !== uid && (
          <span className="ml-auto">
            <ReportButton compact target={{ type: "club", clubId: id }} subject={`${club.name} kulübü`} />
          </span>
        )}
      </div>
    </Card>
  );
}
