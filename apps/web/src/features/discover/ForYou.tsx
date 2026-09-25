"use client";

import { matchSchema, needSchema, type Match, type Need } from "@kampusagi/contracts";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import type { Cursor, Page } from "@/connectors/types";
import { formatPercent } from "@/lib/format";
import { loadAuthors, type AuthorView } from "./authors";
import { FeedNeedCard } from "./FeedNeedCard";
import { useNeedMarks } from "./marks";

type Suggestion = { id: string; need: Need; match: Match; author: AuthorView };

type State = { status: "loading" } | { status: "ready"; items: Suggestion[] } | { status: "error"; message: string };

const LIMIT = 6;

const MAX_PAGES = 5;

export function ForYou({ uid, universityId }: { uid: string; universityId: string }) {
  const { documents } = useConnectors();
  const { ensure } = useNeedMarks();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      const found: Array<Omit<Suggestion, "author">> = [];
      let after: Cursor | null = null;
      for (let page = 0; page < MAX_PAGES && found.length < LIMIT; page += 1) {
        const matches: Page<Match> = await documents.queryPage(
          "matches",
          {
            collectionGroup: true,
            where: [["candidateUid", "==", uid], ["status", "==", "suggested"]],
            orderBy: ["createdAt", "desc"],
            limit: LIMIT * 2,
            after,
          },
          matchSchema,
        );
        const needs = await Promise.allSettled(
          matches.items.map((item) => documents.getDocument(`needs/${item.data.needId}`, needSchema)),
        );
        matches.items.forEach((item, index) => {
          const result = needs[index]!;
          if (result.status === "fulfilled" && result.value?.status === "open") {
            found.push({ id: item.data.needId, need: result.value, match: item.data });
          }
        });
        if (!matches.next) break;
        after = matches.next;
      }
      const shown = found.slice(0, LIMIT);
      const authors = await loadAuthors(
        documents,
        shown.map((item) => ({ uid: item.need.authorUid, universityId: item.need.universityId })),
        universityId,
      );
      return shown.map((item) => ({ ...item, author: authors.get(item.need.authorUid)! }));
    })().then(
      (items) => {
        if (!active) return;
        ensure(items.map((item) => item.id));
        setState({ status: "ready", items });
      },
      (error) => active && setState({ status: "error", message: toAppError(error).message }),
    );
    return () => {
      active = false;
    };
  }, [documents, ensure, uid, universityId]);

  if (state.status === "loading") {
    return (
      <LoadingRegion label="Öneriler yükleniyor…">
        <Card className="flex flex-col gap-3 p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      </LoadingRegion>
    );
  }
  if (state.status === "error") return <ErrorState title="Öneriler yüklenemedi" description={state.message} />;
  if (state.items.length === 0) {
    return (
      <EmptyState
        icon="sparkle"
        title="Henüz sana özel öneri yok"
        description="Profiline ilgi alanı ve beceri eklemek, kampüsündeki ilanlarla eşleşme şansını artırır."
        action={
          <ButtonLink href="/profil" variant="secondary">
            Profilimi düzenle
          </ButtonLink>
        }
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {state.items.map((item) => (
        <li key={item.id} className="flex flex-col gap-2">
          <FeedNeedCard id={item.id} need={item.need} author={item.author} own={false} />
          <div className="rounded-card border border-line bg-primary-soft p-3 text-sm text-ink">
            <p className="flex items-center gap-2 font-semibold">
              <Icon name="sparkle" className="size-4 text-primary" />
              {formatPercent(item.match.score)} uyum
            </p>
            <ul className="mt-1 list-disc pl-6">
              {item.match.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}
