import { useId, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { VerifiedBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatPercent } from "@/lib/format";

export type MatchCardData = {
  name: string;
  department: string;
  verified: boolean;
  score: number;
  reasons: string[];
};

type MatchCardProps = {
  match: MatchCardData;
  headingLevel?: "h2" | "h3";
  footer?: ReactNode;
  className?: string;
};

export function MatchCard({ match, headingLevel: Heading = "h3", footer, className }: MatchCardProps) {
  const titleId = useId();
  const reasonsId = useId();
  const percent = formatPercent(match.score);
  return (
    <Card as="article" aria-labelledby={titleId} className={className}>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Avatar name={match.name} size="lg" decorative />
          <div className="min-w-0 flex-1">
            <Heading id={titleId} className="text-lg font-semibold text-ink">
              {match.name}
            </Heading>
            <p className="text-sm text-ink-muted">{match.department}</p>
            {match.verified && <VerifiedBadge className="mt-1.5" />}
          </div>
          <p className="text-right">
            <span className="block text-3xl font-bold leading-none text-primary">{percent}</span>
            <span className="text-sm text-ink-muted">eşleşme</span>
          </p>
        </div>
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-pill bg-sunken">
          <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.min(100, Math.max(0, match.score))}%` }} />
        </div>
        <div>
          <p id={reasonsId} className="mb-2 font-semibold text-ink">
            Neden eşleştiniz?
          </p>
          <ul aria-labelledby={reasonsId} className="flex flex-col gap-2">
            {match.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-ink">
                <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon name="check" className="size-3.5" strokeWidth={2.5} />
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {footer && <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </Card>
  );
}
