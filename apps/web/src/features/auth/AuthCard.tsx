import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  width?: "narrow" | "wide";
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, width = "narrow", children, footer }: AuthCardProps) {
  return (
    <main id="icerik" className={cn("mx-auto px-4 pb-16 pt-4", width === "narrow" ? "max-w-md" : "max-w-xl")}>
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <div className="text-ink-muted">{description}</div>}
        </div>
        {children}
      </Card>
      {footer && <div className="mt-6 text-center text-ink-muted">{footer}</div>}
    </main>
  );
}
