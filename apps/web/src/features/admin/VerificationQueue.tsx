"use client";

import {
  publicProfileSchema,
  REJECT_REASONS,
  verificationRequestSchema,
  type PublicProfile,
  type RejectReason,
  type VerificationRequest,
} from "@kampusagi/contracts";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { TextArea } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { rejectReasonLabels } from "@/features/verification/labels";
import { formatDateTime } from "@/lib/date";

type QueueItem = { id: string; request: VerificationRequest; profile: PublicProfile | null };

type QueueState = { status: "loading" } | { status: "ready"; items: QueueItem[] } | { status: "error"; message: string };

function supportsInlinePdf() {
  return typeof navigator === "undefined" || navigator.pdfViewerEnabled !== false;
}

function Preview({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const { storage } = useConnectors();
  const [inlinePdf] = useState(supportsInlinePdf);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inlinePdf) return;
    let objectUrl: string | null = null;
    let active = true;
    storage.download(item.request.storagePath).then(
      (blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setUrl(objectUrl);
      },
      (caught) => active && setError(toAppError(caught).message),
    );
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [inlinePdf, item.request.storagePath, storage]);

  return (
    <Modal open onClose={onClose} title="Öğrenci belgesi" description={item.profile?.displayName ?? item.request.uid}>
      {!inlinePdf && (
        <ErrorState
          title="Bu tarayıcı PDF önizlemeyi desteklemiyor"
          description="Belgeyi incelemek için güncel bir masaüstü tarayıcı (Chrome, Edge, Firefox veya Safari) kullan. Belge bu cihaza indirilmedi."
        />
      )}
      {error && <ErrorState title="Belge açılamadı" description={error} />}
      {inlinePdf && !error && !url && <Skeleton className="h-[60vh] w-full" />}
      {url && <iframe src={url} title="Öğrenci belgesi önizlemesi" className="h-[60vh] w-full rounded-control border border-line" />}
    </Modal>
  );
}

function RejectDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: QueueItem;
  onClose: () => void;
  onConfirm: (reason: RejectReason, note: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<RejectReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!reason) {
      setError("Bir sebep seç.");
      return;
    }
    setPending(true);
    await onConfirm(reason, note).finally(() => setPending(false));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Başvuruyu reddet"
      description={item.profile?.displayName ?? item.request.uid}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            Reddet
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Sebep"
          required
          placeholder="Sebep seç"
          options={REJECT_REASONS.map((value) => ({ value, label: rejectReasonLabels[value] }))}
          value={reason}
          error={error}
          onChange={(event) => setReason(event.target.value as RejectReason | "")}
        />
        <TextArea
          label="Öğrenciye not"
          hint="İsteğe bağlı. Kişisel veri yazma."
          maxLength={200}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}

export function VerificationQueue({ moderatorUid }: { moderatorUid: string }) {
  const { documents, functions } = useConnectors();
  const toast = useToast();
  const [state, setState] = useState<QueueState>({ status: "loading" });
  const [preview, setPreview] = useState<QueueItem | null>(null);
  const [rejecting, setRejecting] = useState<QueueItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchQueue = useCallback(async (): Promise<QueueState> => {
    try {
      const requests = await documents.queryCollection(
        "verificationRequests",
        { where: [["status", "==", "pending"]], orderBy: ["createdAt", "asc"], limit: 25 },
        verificationRequestSchema,
      );
      const items = await Promise.all(
        requests.map(async ({ id, data }) => ({
          id,
          request: data,
          profile: await documents.getDocument(`users/${data.uid}`, publicProfileSchema).catch(() => null),
        })),
      );
      return { status: "ready", items };
    } catch (error) {
      return { status: "error", message: toAppError(error).message };
    }
  }, [documents]);

  useEffect(() => {
    let active = true;
    fetchQueue().then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, [fetchQueue]);

  async function reload() {
    setState({ status: "loading" });
    setState(await fetchQueue());
  }

  async function decide(item: QueueItem, decision: "approve" | "reject", rejectReason?: RejectReason, note?: string) {
    setBusy(item.id);
    try {
      await functions.call("reviewVerification", {
        requestId: item.id,
        decision,
        ...(rejectReason && { rejectReason }),
        ...(note?.trim() && { note }),
      });
      toast.show({ title: decision === "approve" ? "Başvuru onaylandı" : "Başvuru reddedildi", tone: "success" });
      setState((current) =>
        current.status === "ready" ? { status: "ready", items: current.items.filter((i) => i.id !== item.id) } : current,
      );
      setRejecting(null);
    } catch (error) {
      toast.show({ title: "İşlem tamamlanamadı", description: toAppError(error).message, tone: "danger" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="kuyruk-baslik" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="kuyruk-baslik" className="text-xl font-semibold">
          Bekleyen öğrenci doğrulamaları
        </h2>
        <Button variant="secondary" onClick={reload}>
          Yenile
        </Button>
      </div>

      {state.status === "loading" && (
        <LoadingRegion label="Başvurular yükleniyor">
          <Skeleton className="h-28 w-full" />
        </LoadingRegion>
      )}
      {state.status === "error" && <ErrorState title="Kuyruk yüklenemedi" description={state.message} />}
      {state.status === "ready" && state.items.length === 0 && (
        <EmptyState icon="shield-check" title="Bekleyen başvuru yok" description="Yeni başvurular burada görünecek." />
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <ul className="space-y-3">
          {state.items.map((item) => {
            const own = item.request.uid === moderatorUid;
            return (
              <li key={item.id}>
                <Card as="article" aria-label={item.profile?.displayName ?? item.request.uid} className="space-y-4 p-5">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{item.profile?.displayName ?? "Profil bulunamadı"}</p>
                    <p className="text-ink-muted">
                      {item.profile?.department} · {item.request.universityId}
                    </p>
                    <p className="text-sm text-ink-muted">Başvuru: {formatDateTime(item.request.createdAt)}</p>
                    {own && <p className="text-sm font-semibold text-danger">Kendi başvurunu inceleyemezsin.</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setPreview(item)}>
                      Belgeyi görüntüle
                    </Button>
                    <Button onClick={() => decide(item, "approve")} disabled={own || busy === item.id}>
                      Onayla
                    </Button>
                    <Button variant="danger" onClick={() => setRejecting(item)} disabled={own || busy === item.id}>
                      Reddet
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {preview && <Preview item={preview} onClose={() => setPreview(null)} />}
      {rejecting && (
        <RejectDialog
          item={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={(reason, note) => decide(rejecting, "reject", reason, note)}
        />
      )}
    </section>
  );
}
