"use client";

import { needDraftIdSchema, needSchema, publicProfileSchema } from "@kampusagi/contracts";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Tag } from "@/components/ui/Tag";
import { NeedCard } from "@/components/need/NeedCard";
import { useSignedIn } from "@/features/app/guards";
import { useDocument } from "@/features/data/useDocument";
import { formatDateTime } from "@/lib/date";
import { categoryLabels, formatParticipants, formatWhen, visibilityLabels } from "./labels";
import { NeedMatches } from "./NeedMatches";

const OTHER_CAMPUS_AUTHOR = { name: "Doğrulanmış öğrenci", department: "Başka bir üniversite", verified: true };
const UNKNOWN_AUTHOR = { name: "Öğrenci", department: "Profil bilgisi alınamadı", verified: false };

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
  const validId = needDraftIdSchema.safeParse(needId).success;
  const need = useDocument(validId ? `needs/${needId}` : null, needSchema);
  const authorUid = need.status === "ready" ? need.data.authorUid : null;
  const author = useDocument(authorUid ? `users/${authorUid}` : null, publicProfileSchema);
  const { session } = useSignedIn();

  if (!validId || need.status === "missing") return <NotFound />;
  if (need.status === "error") {
    return need.error.code === "permission-denied" ? (
      <NotFound />
    ) : (
      <ErrorState title="İlan yüklenemedi" description={need.error.message} />
    );
  }
  if (need.status === "loading" || author.status === "loading") return <DetailSkeleton />;

  const data = need.data;
  const own = data.authorUid === session.user.uid;
  let authorView = UNKNOWN_AUTHOR;
  if (author.status === "ready") {
    authorView = {
      name: author.data.displayName,
      department: author.data.department,
      verified: author.data.verificationStatus === "verified",
    };
  } else if (author.status === "error" && author.error.code === "permission-denied") {
    authorView = OTHER_CAMPUS_AUTHOR;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge icon={data.visibility === "global" ? "compass" : "lock"} tone="neutral">
          {visibilityLabels[data.visibility].title}
        </Badge>
        {own && <Badge tone="accent">Senin ilanın</Badge>}
        {data.status === "closed" && <Badge tone="neutral">Kapandı</Badge>}
      </div>
      <NeedCard
        headingLevel="h2"
        need={{
          title: data.parsed.title,
          category: categoryLabels[data.parsed.category],
          tags: data.parsed.tags,
          when: formatWhen(data.parsed.when),
          participants: formatParticipants(data.parsed.participants),
          location: data.parsed.locationHint ?? undefined,
          postedAgo: formatDateTime(data.createdAt),
          author: authorView,
        }}
      />
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
    </div>
  );
}
