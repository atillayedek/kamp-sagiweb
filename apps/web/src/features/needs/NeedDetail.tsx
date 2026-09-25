"use client";

import { useEffect } from "react";
import { needDraftIdSchema, needSchema, publicProfileSchema, type Need, type PublicProfile } from "@kampusagi/contracts";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Tag } from "@/components/ui/Tag";
import { NeedCard } from "@/components/need/NeedCard";
import { useSignedIn } from "@/features/app/guards";
import { useDocument, type DocumentState } from "@/features/data/useDocument";
import { OTHER_CAMPUS_AUTHOR, UNKNOWN_AUTHOR, type AuthorView } from "@/features/discover/authors";
import { toCardData, useNeedActions } from "@/features/discover/FeedNeedCard";
import { NeedMarksProvider, useNeedMarks } from "@/features/discover/marks";
import { CloseNeed } from "./CloseNeed";
import { visibilityLabels } from "./labels";
import { NeedInterests } from "./NeedInterests";
import { NeedMatches } from "./NeedMatches";


function DetailSkeleton() {
  return (
    <LoadingRegion label="İlan yükleniyor…">
      <Card className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </Card>
    </LoadingRegion>
  );
}

function NotFound() {
  return (
    <EmptyState
      icon="compass"
      title="İlan bulunamadı"
      description="İlan kaldırılmış olabilir ya da görme iznin yok."
      action={<ButtonLink href="/kesfet">Keşfet&apos;e dön</ButtonLink>}
    />
  );
}

export function NeedDetail({ needId }: { needId: string }) {
  const { session } = useSignedIn();
  return (
    <NeedMarksProvider uid={session.user.uid}>
      <NeedDetailContent needId={needId} />
    </NeedMarksProvider>
  );
}

function NeedDetailContent({ needId }: { needId: string }) {
  const validId = needDraftIdSchema.safeParse(needId).success;
  const need = useDocument(validId ? `needs/${needId}` : null, needSchema);
  const { session, profile } = useSignedIn();
  const viewerUniversity = session.claims.universityId ?? profile.universityId;
  const sameCampus = need.status === "ready" && need.data.universityId === viewerUniversity;
  const author = useDocument(sameCampus ? `users/${need.data.authorUid}` : null, publicProfileSchema);

  if (!validId || need.status === "missing") return <NotFound />;
  if (need.status === "error") {
    return need.error.code === "permission-denied" ? (
      <NotFound />
    ) : (
      <ErrorState title="İlan yüklenemedi" description={need.error.message} />
    );
  }
  if (need.status === "loading" || (sameCampus && author.status === "loading")) return <DetailSkeleton />;
  return (
    <NeedDetailView needId={needId} data={need.data} author={sameCampus ? author : null} uid={session.user.uid} />
  );
}

function NeedDetailView({
  needId,
  data,
  author,
  uid,
}: {
  needId: string;
  data: Need;
  author: DocumentState<PublicProfile> | null;
  uid: string;
}) {
  const own = data.authorUid === uid;
  const actions = useNeedActions(needId, data, own);
  const { ensure } = useNeedMarks();
  useEffect(() => {
    if (!own) ensure([needId]);
  }, [ensure, needId, own]);
  let authorView: AuthorView = author ? UNKNOWN_AUTHOR : OTHER_CAMPUS_AUTHOR;
  if (author?.status === "ready") {
    authorView = {
      name: author.data.displayName,
      department: author.data.department,
      verified: author.data.verificationStatus === "verified",
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge icon={data.visibility === "global" ? "compass" : "lock"} tone="neutral">
          {visibilityLabels[data.visibility].title}
        </Badge>
        {own && <Badge tone="accent">Senin ilanın</Badge>}
      </div>
      <NeedCard headingLevel="h2" need={toCardData(data, authorView)} actions={actions} />
      {own && <CloseNeed needId={needId} closed={data.status === "closed"} />}
      {data.parsed.requiredSkills.length > 0 && (
        <section aria-labelledby="need-skills" className="flex flex-col gap-2">
          <h3 id="need-skills" className="font-semibold text-ink">
            Gereken beceriler
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {data.parsed.requiredSkills.map((skill) => (
              <li key={skill}>
                <Tag tone="neutral">{skill}</Tag>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="need-text" className="flex flex-col gap-2">
        <h3 id="need-text" className="font-semibold text-ink">
          İlan metni
        </h3>
        <p className="whitespace-pre-line rounded-card border border-line bg-surface p-4 text-ink">{data.rawText}</p>
      </section>
      {own && (
        <section aria-labelledby="need-matches" className="flex flex-col gap-3">
          <h2 id="need-matches" className="text-xl font-bold text-ink">
            Eşleşmeler
          </h2>
          <p className="text-sm text-ink-muted">
            Skor ve gerekçeler sunucuda, ilanın ve öğrencilerin profillerinden hesaplanır.
          </p>
          <NeedMatches needId={needId} needStatus={data.status} matchStatus={data.matchStatus} matchCount={data.matchCount} />
        </section>
      )}
      {own && (
        <section aria-labelledby="need-interests" className="flex flex-col gap-3">
          <h2 id="need-interests" className="text-xl font-bold text-ink">
            İlgilenenler
          </h2>
          <NeedInterests needId={needId} />
        </section>
      )}
    </div>
  );
}
