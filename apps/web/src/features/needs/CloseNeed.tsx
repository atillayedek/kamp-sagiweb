"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { serverTime } from "@/connectors/types";

export function CloseNeed({ needId, closed }: { needId: string; closed: boolean }) {
  const { writer } = useConnectors();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justClosed, setJustClosed] = useState(false);
  const noticeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (justClosed && closed && !open) noticeRef.current?.focus();
  }, [closed, justClosed, open]);

  async function close() {
    setBusy(true);
    try {
      await writer.updateFields(`needs/${needId}`, { status: "closed", updatedAt: serverTime });
      toast.show({ title: "İlan kapatıldı", tone: "success" });
      setJustClosed(true);
      setOpen(false);
    } catch (error) {
      toast.show({ title: "İlan kapatılamadı", description: toAppError(error).message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  if (closed && !open) {
    return justClosed ? (
      <p ref={noticeRef} tabIndex={-1} className="font-medium text-ink">
        İlanını kapattın. Artık akışta görünmüyor.
      </p>
    ) : null;
  }

  return (
    <div>
      <Button variant="danger" onClick={() => setOpen(true)}>
        İlanı kapat
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="İlanı kapat"
        description="Kapalı ilan akışta görünmez ve yeni ilgi alamaz. Bu işlem geri alınamaz."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Vazgeç
            </Button>
            <Button variant="danger" onClick={close} disabled={busy}>
              {busy ? "Kapatılıyor…" : "İlanı kapat"}
            </Button>
          </>
        }
      >
        <p className="text-ink">Mevcut eşleşmeler ve ilgilenenler listesi sende görünmeye devam eder.</p>
      </Modal>
    </div>
  );
}
