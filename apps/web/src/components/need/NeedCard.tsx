import { useId } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import { TearOffStrip, type TearOffAction } from "./TearOffStrip";

export type NeedCardData = {
  title: string;
  category: string;
  tags: string[];
  when: string;
  participants: string;
  location?: string;
  postedAgo?: string;
  author: {
    name: string;
    department: string;
    verified: boolean;
  };
};

type NeedCardProps = {
  need: NeedCardData;
  actions?: TearOffAction[];
  pinned?: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
};

function Detail({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={icon} className="size-4.5 text-ink-muted" />
      <dt className="sr-only">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function NeedCard({ need, actions, pinned = false, headingLevel: Heading = "h3", className }: NeedCardProps) {
  const titleId = useId();
  return (
    <Card as="article" aria-labelledby={titleId} className={cn("relative", className)}>
      {pinned && (
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-accent shadow-card ring-2 ring-surface"
        />
      )}
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <Tag tone="accent">{need.category}</Tag>
          {need.postedAgo && <span className="text-sm text-ink-muted">{need.postedAgo}</span>}
        </div>
        <Heading id={titleId} className="text-lg font-semibold leading-snug text-ink">
          {need.title}
        </Heading>
        <dl className="grid gap-1.5 text-sm text-ink">
          <Detail icon="calendar" label="Zaman" value={need.when} />
          <Detail icon="users" label="Aranan kişi" value={need.participants} />
          {need.location && <Detail icon="map-pin" label="Konum" value={need.location} />}
        </dl>
        {need.tags.length > 0 && (
          <ul aria-label="Etiketler" className="flex flex-wrap gap-1.5">
            {need.tags.map((tag) => (
              <li key={tag}>
                <Tag>{tag}</Tag>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
          <Avatar name={need.author.name} size="sm" decorative />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-ink">{need.author.name}</p>
            <p className="text-ink-muted">{need.author.department}</p>
          </div>
          {need.author.verified && <VerifiedBadge />}
        </div>
      </div>
      {actions && actions.length > 0 && <TearOffStrip actions={actions} context={need.title} />}
    </Card>
  );
}
