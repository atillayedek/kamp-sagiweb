"use client";

import {
  COMMUNITY_LIMITS,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  reportContentRequestSchema,
  type ReportReason,
  type ReportTarget,
} from "@kampusagi/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextArea } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";

const reasonOptions = REPORT_REASONS.map((value) => ({ value, label: REPORT_REASON_LABELS[value] }));

type ReportButtonProps = {
  target: ReportTarget;
  /** Ekran okuyucu için bağlam, ör. "Deniz'in gönderisi". */
  subject: string;
  compact?: boolean;
};

export function ReportButton({ target, subject, compact = false }: ReportButtonProps) {
  const { functions } = useConnectors();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
    setDetailsError(undefined);
  }

  async function submit() {
    const input = reportContentRequestSchema.safeParse({ target, reason, details });
    if (!input.success) {
      const issue = input.error.issues[0];
      if (issue?.path[0] === "details") setDetailsError(issue.message);
      else setError(issue?.message ?? "Bildirim geçersiz.");
      return;
    }
    setBusy(true);
    setError(null);
    setDetailsError(undefined);
    try {
      const result = await functions.call("reportContent", { target, reason, details: input.data.details });
      toast.show(
        result.status === "created"
          ? { title: "Bildirimin alındı", description: "Moderatörler inceleyecek. Teşekkürler.", tone: "success" }
          : { title: "Bu içeriği daha önce bildirmiştin", description: "Bildirimin inceleme sırasında.", tone: "info" },
      );
      setDetails("");
      setReason("spam");
      setOpen(false);
    } catch (caught) {
      setError(toAppError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        className={compact ? "min-h-11 px-3 text-sm" : undefined}
        aria-label={`Bildir: ${subject}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="flag" className="size-4.5" />
        Bildir
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="İçeriği bildir"
        description="Bildirimler moderatörlere iletilir; kimliğin içerik sahibiyle paylaşılmaz."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Vazgeç
            </Button>
            <Button variant="danger" onClick={submit} disabled={busy}>
              {busy ? "Gönderiliyor…" : "Bildir"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <RadioGroup legend="Neden bildiriyorsun?" value={reason} options={reasonOptions} onChange={setReason} />
          <TextArea
            label={reason === "other" ? "Açıklama" : "Açıklama (isteğe bağlı)"}
            hint="Kişisel bilgi (telefon, e-posta, kimlik numarası) yazma."
            value={details}
            maxLength={COMMUNITY_LIMITS.reportDetails.max}
            rows={3}
            required={reason === "other"}
            error={detailsError}
            onChange={(event) => setDetails(event.target.value)}
          />
          {error && (
            <p role="alert" className="font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
