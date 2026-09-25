"use client";

import { eventSchema, type CampusEvent } from "@kampusagi/contracts";
import { useCallback, useId, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import type { QueryOptions } from "@/connectors/types";
import { formatDateTime } from "@/lib/date";
import { adjustCount, countLabel, visibilityBadges } from "./labels";
import { PagedList, type PageLoader } from "./PagedList";
import { usePresence } from "./presence";
import { ReportButton } from "./ReportButton";

const PAGE_SIZE = 20;

export function formatEventTime(event: Pick<CampusEvent, "startsAt" | "endsAt">): string {
  return event.endsAt ? `${formatDateTime(event.startsAt)} – ${formatDateTime(event.endsAt)}` : formatDateTime(event.startsAt);
}

export function EventsSection({ uid, universityId }: { uid: string; universityId: string }) {
  const { documents } = useConnectors();

  const loader = useCallback(
    (where: QueryOptions["where"]): PageLoader<CampusEvent> =>
      (after) => documents.queryPage("events", { where, orderBy: ["startsAt", "asc"], limit: PAGE_SIZE, after }, eventSchema),
    [documents],
  );
  const loaders = useMemo(() => {
    const now = new Date();
    return {
      campus: loader([
        ["universityId", "==", universityId],
        ["startsAt", ">=", now],
      ]),
      global: loader([
        ["visibility", "==", "global"],
        ["startsAt", ">=", now],
      ]),
    };
  }, [loader, universityId]);
  const renderEvent = useCallback(
    (item: { id: string; data: CampusEvent }) => <EventCard id={item.id} event={item.data} uid={uid} />,
    [uid],
  );

  const list = (load: PageLoader<CampusEvent>, empty: { title: string; description: string }) => (
    <PagedList
      load={load}
      renderItem={renderEvent}
      label="Etkinlikler"
      noun="etkinlik"
      empty={{ ...empty, icon: "calendar" }}
      errorTitle="Etkinlikler yüklenemedi"
    />
  );

  return (
    <section aria-labelledby="events" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="events" className="text-xl font-bold text-ink">
          Yaklaşan etkinlikler
        </h2>
        <ButtonLink href="/topluluklar/etkinlik/yeni">Etkinlik oluştur</ButtonLink>
      </div>
      <Tabs
        label="Etkinlik listesi"
        lazy
        keepMounted
        items={[
          {
            id: "kampus",
            label: "Kampüsüm",
            content: list(loaders.campus, {
              title: "Kampüsünde yaklaşan etkinlik yok",
              description: "Bir etkinlik oluşturup kampüsünü davet edebilirsin.",
            }),
          },
          {
            id: "genel",
            label: "Tüm üniversiteler",
            content: list(loaders.global, {
              title: "Tüm üniversitelere açık yaklaşan etkinlik yok",
              description: "Genel görünürlüklü etkinlikler burada listelenir.",
            }),
          },
        ]}
      />
    </section>
  );
}

function EventCard({ id, event, uid }: { id: string; event: CampusEvent; uid: string }) {
  const titleId = useId();
  const attendance = usePresence(`events/${id}/attendees/${uid}`, "joinedAt", {
    on: "Etkinliğe katılıyorsun",
    off: "Katılımın geri alındı",
    failed: "Katılım güncellenemedi",
  });
  const state = attendance.state;
  const attending = state.status === "ready" && state.on;
  const busy = state.status !== "ready" || state.busy;
  const visibility = visibilityBadges[event.visibility];

  return (
    <Card as="article" aria-labelledby={titleId} className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral" icon={visibility.icon}>
          {visibility.label}
        </Badge>
        {event.organizerUid === uid && <Badge tone="accent">Düzenleyen sensin</Badge>}
        {attending && <Badge icon="check">Katılıyorsun</Badge>}
      </div>
      <h3 id={titleId} className="text-lg font-semibold leading-snug text-ink">
        {event.title}
      </h3>
      <dl className="grid gap-1.5 text-sm text-ink">
        <div className="flex items-center gap-2">
          <Icon name="calendar" className="size-4.5 text-ink-muted" />
          <dt className="sr-only">Zaman</dt>
          <dd>{formatEventTime(event)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="map-pin" className="size-4.5 text-ink-muted" />
          <dt className="sr-only">Yer</dt>
          <dd>{event.location}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="users" className="size-4.5 text-ink-muted" />
          <dt className="sr-only">Katılımcı</dt>
          <dd>{countLabel(adjustCount(event.attendeeCount, state), "katılımcı")}</dd>
        </div>
      </dl>
      {event.description && <p className="whitespace-pre-line break-words text-ink">{event.description}</p>}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {state.status === "error" ? (
          <p className="text-sm text-danger">Katılım durumu yüklenemedi.</p>
        ) : (
          <Button
            variant={attending ? "secondary" : "primary"}
            aria-disabled={busy || undefined}
            aria-label={`${attending ? "Katılımı geri al" : "Katıl"}: ${event.title}`}
            onClick={() => void attendance.toggle()}
          >
            {attending ? "Katılımı geri al" : "Katıl"}
          </Button>
        )}
        {event.organizerUid !== uid && (
          <span className="ml-auto">
            <ReportButton compact target={{ type: "event", eventId: id }} subject={`${event.title} etkinliği`} />
          </span>
        )}
      </div>
    </Card>
  );
}
