"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { IconName } from "@/components/ui/Icon";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { toAppError } from "@/connectors/errors";
import type { Cursor, ListedDocument, Page } from "@/connectors/types";

export type PageLoader<T> = (after: Cursor | null) => Promise<Page<T>>;

type ListState<T> = {
  items: Array<ListedDocument<T>>;
  next: Cursor | null;
  status: "loading" | "ready" | "more" | "error";
  error?: string;
};

type PagedListProps<T> = {
  load: PageLoader<T>;
  renderItem: (item: ListedDocument<T>) => ReactNode;
  label: string;
  noun: string;
  empty: { title: string; description: string; icon?: IconName };
  errorTitle: string;
  hide?: (id: string) => boolean;
  /** Bu oturumda eklenen, listenin sonuna ait öğeler (ör. yeni yorum); son sayfa yüklendiğinde gösterilir. */
  trailing?: Array<ListedDocument<T>>;
};

function ListSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label}>
      <div className="flex flex-col gap-4">
        {[0, 1].map((index) => (
          <Card key={index} className="flex flex-col gap-3 p-5">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function PagedList<T>({ load, renderItem, label, noun, empty, errorTitle, hide, trailing = [] }: PagedListProps<T>) {
  const [state, setState] = useState<ListState<T>>({ items: [], next: null, status: "loading" });
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const focusId = useRef<string | null>(null);
  // Her yükleme turu kendi kuşağına aittir; kaynak değişince eski yanıtlar yok sayılır.
  const generation = useRef(0);
  const hideRef = useRef(hide);

  useEffect(() => {
    hideRef.current = hide;
  });

  const fetchPage = useCallback(
    async (after: Cursor | null, previous: Array<ListedDocument<T>>) => {
      const run = generation.current;
      setState((current) => ({ ...current, status: after ? "more" : "loading", error: undefined }));
      try {
        const page = await load(after);
        if (run !== generation.current) return;
        const items = [...previous, ...page.items];
        if (after) {
          focusId.current = page.items.find((item) => !hideRef.current?.(item.id))?.id ?? null;
          setAnnouncement(`${page.items.length} ${noun} daha yüklendi. Toplam ${items.length} ${noun} gösteriliyor.`);
        }
        setState({ items, next: page.next, status: "ready" });
      } catch (error) {
        if (run === generation.current) {
          setState((current) => ({ ...current, status: "error", error: toAppError(error).message }));
        }
      }
    },
    [load, noun],
  );

  useEffect(() => {
    generation.current += 1;
    void fetchPage(null, []);
    return () => {
      generation.current += 1;
    };
  }, [fetchPage]);

  useEffect(() => {
    if (focusId.current === null) return;
    const target = listRef.current
      ?.querySelector<HTMLElement>(`li[data-item-id="${CSS.escape(focusId.current)}"]`)
      ?.querySelector<HTMLElement>("a, button");
    focusId.current = null;
    target?.focus();
  }, [state.items]);

  if (state.status === "loading") return <ListSkeleton label={`${label} yükleniyor…`} />;
  if (state.status === "error" && state.items.length === 0) {
    return (
      <ErrorState
        title={errorTitle}
        description={state.error}
        action={<Button onClick={() => void fetchPage(null, [])}>Tekrar dene</Button>}
      />
    );
  }
  const loadedIds = new Set(state.items.map((item) => item.id));
  const extra = state.next ? [] : trailing.filter((item) => !loadedIds.has(item.id));
  const visible = [...state.items, ...extra].filter((item) => !hide?.(item.id));
  if (visible.length === 0 && !state.next) {
    return <EmptyState icon={empty.icon ?? "users"} title={empty.title} description={empty.description} />;
  }

  const loadingMore = state.status === "more";
  return (
    <div className="flex flex-col gap-4">
      <ul ref={listRef} aria-label={label} className="flex flex-col gap-4">
        {visible.map((item) => (
          <li key={item.id} data-item-id={item.id}>
            {renderItem(item)}
          </li>
        ))}
      </ul>
      {state.status === "error" && (
        <p role="alert" className="font-medium text-danger">
          Daha fazlası yüklenemedi: {state.error}
        </p>
      )}
      {state.next && (
        <div>
          <Button
            variant="secondary"
            aria-disabled={loadingMore || undefined}
            onClick={() => {
              if (!loadingMore) void fetchPage(state.next, state.items);
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
