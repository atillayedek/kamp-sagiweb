"use client";

import type { Need } from "@kampusagi/contracts";
import { NeedCard } from "@/components/need/NeedCard";
import type { TearOffAction } from "@/components/need/TearOffStrip";
import { categoryLabels, formatParticipants, formatWhen } from "@/features/needs/labels";
import { formatDateTime } from "@/lib/date";
import type { AuthorView } from "./authors";
import { useNeedMarks, type MarkKind } from "./marks";

type FeedNeedCardProps = {
  id: string;
  need: Need;
  author: AuthorView;
  own: boolean;
  headingLevel?: "h2" | "h3";
  className?: string;
};

export function useNeedActions(id: string, need: Need, own: boolean): TearOffAction[] | undefined {
  const marks = useNeedMarks();
  const mark = marks.get(id);
  if (own || !mark) return undefined;
  const open = need.status === "open";
  const action = (kind: MarkKind, label: string, icon: TearOffAction["icon"]): TearOffAction => ({
    id: kind,
    label,
    icon,
    toggle: true,
    pressed: mark[kind],
    busy: marks.busy(kind, id),
    onSelect: (next) => void marks.toggle(kind, id, next),
  });
  const actions = [action("interested", "İlgileniyorum", "hand"), action("saved", "Kaydet", "bookmark")];
  const visible = open ? actions : actions.filter((item) => item.pressed);
  return visible.length > 0 ? visible : undefined;
}

export function toCardData(need: Need, author: AuthorView) {
  return {
    title: need.parsed.title,
    category: categoryLabels[need.parsed.category],
    tags: need.parsed.tags,
    when: formatWhen(need.parsed.when),
    participants: formatParticipants(need.parsed.participants),
    location: need.parsed.locationHint ?? undefined,
    postedAgo: formatDateTime(need.createdAt),
    closed: need.status === "closed",
    author,
  };
}

export function FeedNeedCard({ id, need, author, own, headingLevel = "h3", className }: FeedNeedCardProps) {
  const actions = useNeedActions(id, need, own);
  return (
    <NeedCard
      href={`/kesfet/ilan/${id}`}
      headingLevel={headingLevel}
      need={toCardData(need, author)}
      actions={actions}
      className={className}
    />
  );
}
