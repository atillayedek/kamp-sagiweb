"use client";

import type { Need } from "@kampusagi/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import type { Cursor, ListedDocument, Page } from "@/connectors/types";
import { loadAuthors, type AuthorView } from "./authors";
import { FeedNeedCard } from "./FeedNeedCard";
import { useNeedMarks } from "./marks";

export type NeedLoader = (after: Cursor | null) => Promise<Page<Need>>;

type FeedState = {
  items: Array<ListedDocument<Need>>;
  authors: ReadonlyMap<string, AuthorView>;
  next: Cursor | null;
  status: "loading" | "ready" | "more" | "error";
  error?: string;
};

const MAX_EMPTY_PAGES = 5;

function FeedSkeleton() {
  return (
    <LoadingRegion label="İlanlar yükleniyor…">
      <div className="flex flex-col gap-4">
        {[0, 1].map((index) => (
          <Card key={index} className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    </LoadingRegion>
  );
}

type NeedFeedProps = {
  load: NeedLoader;
  uid: string;
  universityId: string;
  empty: { title: string; description: string };
  hide?: (id: string) => boolean;
};

export function NeedFeed({ load, uid, universityId, empty, hide }: NeedFeedProps) {
  const { documents } = useConnectors();
  const marks = useNeedMarks();
  const { ensure } = marks;
  const [state, setState] = useState<FeedState>({ items: [], authors: new Map(), next: null, status: "loading" });
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndex = useRef<number | null>(null);
  const loaded = useRef<Array<ListedDocument<Need>>>([]);
  const active = useRef(true);

  const fetchPage = useCallback(
    async (after: Cursor | null, known: ReadonlyMap<string, AuthorView>) => {
      setState((current) => ({ ...current, status: after ? "more" : "loading", error: undefined }));
      try {
        let page = await load(after);
        for (let skipped = 0; page.items.length === 0 && page.next && skipped < MAX_EMPTY_PAGES; skipped += 1) {
          page = await load(page.next);
        }
        const authors = await loadAuthors(
          documents,
          page.items.map((item) => ({ uid: item.data.authorUid, universityId: item.data.universityId })),
          universityId,
          known,
        );
        if (!active.current) return;
        ensure(page.items.map((item) => item.id));
        const previous = after ? loaded.current : [];
        const items = [...previous, ...page.items];
        loaded.current = items;
        if (after) {
          focusIndex.current = previous.length;
          setAnnouncement(`${page.items.length} ilan daha yüklendi. Toplam ${items.length} ilan gösteriliyor.`);
        }
        setState({ items, authors, next: page.next, status: "ready" });
      } catch (error) {
        if (active.current) setState((current) => ({ ...current, status: "error", error: toAppError(error).message }));
      }
    },
    [documents, ensure, load, universityId],
  );

  useEffect(() => {
    active.current = true;
    void fetchPage(null, new Map());
    return () => {
      active.current = false;
    };
  }, [fetchPage]);

  useEffect(() => {
    if (focusIndex.current === null) return;
    const link = listRef.current?.children[focusIndex.current]?.querySelector<HTMLElement>("a, button");
    focusIndex.current = null;
    link?.focus();
  }, [state.items]);

  if (state.status === "loading") return <FeedSkeleton />;
  if (state.status === "error" && state.items.length === 0) {
    return (
      <ErrorState
        title="İlanlar yüklenemedi"
        description={state.error}
        action={<Button onClick={() => void fetchPage(null, state.authors)}>Tekrar dene</Button>}
      />
    );
  }
  const visible = hide ? state.items.filter((item) => !hide(item.id)) : state.items;
  if (visible.length === 0 && !state.next) {
    return <EmptyState icon="compass" title={empty.title} description={empty.description} />;
  }

  const loadingMore = state.status === "more";
  return (
    <div className="flex flex-col gap-4">
      <ul ref={listRef} className="flex flex-col gap-4">
        {visible.map((item) => (
          <li key={item.id}>
            <FeedNeedCard
              id={item.id}
              need={item.data}
              own={item.data.authorUid === uid}
              author={state.authors.get(item.data.authorUid)!}
            />
          </li>
        ))}
      </ul>
      {state.status === "error" && (
        <p role="alert" className="font-medium text-danger">
          Daha fazla ilan yüklenemedi: {state.error}
        </p>
      )}
      {state.next && (
        <div>
          <Button
            variant="secondary"
            aria-disabled={loadingMore || undefined}
            onClick={() => {
              if (!loadingMore) void fetchPage(state.next, state.authors);
            }}
          >
            {loadingMore ? "Yükleniyor…" : "Daha fazla göster"}
          </Button>
        </div>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
