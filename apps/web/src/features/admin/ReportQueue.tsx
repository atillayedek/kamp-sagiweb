"use client";

import { REPORT_REASON_LABELS, REPORT_TARGET_LABELS, reportSchema, type Report } from "@kampusagi/contracts";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { visibilityBadges } from "@/features/community/labels";
import { PagedList, type PageLoader } from "@/features/community/PagedList";
import { formatDateTime } from "@/lib/date";

const PAGE_SIZE = 20;

function ReportItem({ report }: { report: Report }) {
  const title = `${REPORT_TARGET_LABELS[report.targetType]} · ${REPORT_REASON_LABELS[report.reason]}`;
  return (
    <Card as="article" aria-label={title} className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="danger" icon="flag">
          {REPORT_REASON_LABELS[report.reason]}
        </Badge>
        <Badge tone="neutral">{REPORT_TARGET_LABELS[report.targetType]}</Badge>
        {report.snapshot.visibility && (
          <Badge tone="neutral" icon={visibilityBadges[report.snapshot.visibility].icon}>
            {visibilityBadges[report.snapshot.visibility].label}
          </Badge>
        )}
      </div>
      {report.snapshot.title && <p className="text-lg font-semibold text-ink">{report.snapshot.title}</p>}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink-muted">Bildirim anındaki içerik</p>
        <p className="max-h-48 overflow-y-auto whitespace-pre-line break-words rounded-control border border-line bg-sunken p-3 text-ink">
          {report.snapshot.text || "—"}
        </p>
      </div>
      {report.details && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-muted">Bildirenin notu</p>
          <p className="whitespace-pre-line break-words text-ink">{report.details}</p>
        </div>
      )}
      <dl className="grid gap-1 text-sm text-ink-muted sm:grid-cols-2">
        <div>
          <dt className="inline">Bildirim: </dt>
          <dd className="inline">{formatDateTime(report.createdAt)}</dd>
        </div>
        <div>
          <dt className="inline">İçerik tarihi: </dt>
          <dd className="inline">{formatDateTime(report.snapshot.createdAt)}</dd>
        </div>
        <div>
          <dt className="inline">İçeriğin üniversitesi: </dt>
          <dd className="inline">{report.targetUniversityId}</dd>
        </div>
        <div>
          <dt className="inline">Bildirenin üniversitesi: </dt>
          <dd className="inline">{report.reporterUniversityId}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline">Hedef: </dt>
          <dd className="inline break-all font-mono text-xs">{report.targetPath}</dd>
        </div>
      </dl>
    </Card>
  );
}

export function ReportQueue() {
  const { documents } = useConnectors();
  const [version, setVersion] = useState(0);
  const load = useMemo<PageLoader<Report>>(
    () => (after) =>
      documents.queryPage(
        "reports",
        { where: [["status", "==", "open"]], orderBy: ["createdAt", "asc"], limit: PAGE_SIZE, after },
        reportSchema,
      ),
    [documents],
  );
  const renderReport = useCallback((item: { id: string; data: Report }) => <ReportItem report={item.data} />, []);

  return (
    <section aria-labelledby="rapor-kuyrugu" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rapor-kuyrugu" className="text-xl font-semibold">
          Açık içerik bildirimleri
        </h2>
        <Button variant="secondary" onClick={() => setVersion((current) => current + 1)}>
          Yenile
        </Button>
      </div>
      <p className="text-sm text-ink-muted">
        En eski bildirim en üsttedir. İçerik, bildirim anındaki hâliyle saklanır; kaldırma ve uyarı araçları hazırlanıyor.
      </p>
      <PagedList
        key={version}
        load={load}
        renderItem={renderReport}
        label="Açık bildirimler"
        noun="bildirim"
        empty={{ title: "Açık bildirim yok", description: "Yeni bildirimler burada görünecek.", icon: "flag" }}
        errorTitle="Bildirimler yüklenemedi"
      />
    </section>
  );
}
