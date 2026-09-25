"use client";

import { needInterestSchema } from "@kampusagi/contracts";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { useSignedIn } from "@/features/app/guards";
import { loadAuthors, type AuthorView } from "@/features/discover/authors";
import { formatDateTime } from "@/lib/date";

type Interested = { uid: string; at: string | null; author: AuthorView };

type State = { status: "loading" } | { status: "ready"; items: Interested[] } | { status: "error"; message: string };

export function NeedInterests({ needId }: { needId: string }) {
  const { documents } = useConnectors();
  const { session, profile } = useSignedIn();
  const universityId = session.claims.universityId ?? profile.universityId;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      const interests = await documents.queryCollection(
        `needs/${needId}/interests`,
        { orderBy: ["createdAt", "desc"], limit: 50 },
        needInterestSchema,
      );
      const authors = await loadAuthors(
        documents,
        interests.map((item) => ({ uid: item.data.uid, universityId: null })),
        universityId,
      );
      return interests.map((item) => ({ uid: item.data.uid, at: item.data.createdAt, author: authors.get(item.data.uid)! }));
    })().then(
      (items) => active && setState({ status: "ready", items }),
      (error) => active && setState({ status: "error", message: toAppError(error).message }),
    );
    return () => {
      active = false;
    };
  }, [documents, needId, universityId]);

  if (state.status === "loading") {
    return (
      <LoadingRegion label="İlgilenenler yükleniyor…">
        <Skeleton className="h-12 w-full" />
      </LoadingRegion>
    );
  }
  if (state.status === "error") return <ErrorState title="İlgilenenler yüklenemedi" description={state.message} />;
  if (state.items.length === 0) {
    return <EmptyState icon="hand" title="Henüz ilgilenen yok" description="Bir öğrenci “İlgileniyorum” dediğinde burada görünür." />;
  }
  return (
    <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
      {state.items.map((item) => (
        <li key={item.uid} className="flex items-center gap-3 p-4">
          <Avatar name={item.author.name} size="sm" decorative />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{item.author.name}</p>
            <p className="text-sm text-ink-muted">{item.author.department}</p>
          </div>
          <p className="text-sm text-ink-muted">{formatDateTime(item.at)}</p>
        </li>
      ))}
    </ul>
  );
}
