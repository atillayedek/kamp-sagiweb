"use client";

import { VERIFICATION_MAX_BYTES, verificationStoragePath } from "@kampusagi/contracts";
import { useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import type { UploadHandle } from "@/connectors/types";

type Phase = { name: "idle" } | { name: "uploading"; progress: number } | { name: "submitting" };

export function VerificationUpload({ uid }: { uid: string }) {
  const { storage, functions } = useConnectors();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const handle = useRef<UploadHandle | null>(null);

  async function submit() {
    if (!file) return;
    setError(null);
    const requestId = crypto.randomUUID();
    const upload = storage.upload(verificationStoragePath(uid, requestId), file, {
      contentType: "application/pdf",
      onProgress: (progress) => setPhase({ name: "uploading", progress }),
    });
    handle.current = upload;
    setPhase({ name: "uploading", progress: 0 });
    try {
      await upload.done;
      setPhase({ name: "submitting" });
      await functions.call("submitVerification", { requestId });
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError.code === "cancelled" ? "Yükleme iptal edildi." : appError.message);
      setPhase({ name: "idle" });
    } finally {
      handle.current = null;
    }
  }

  if (phase.name !== "idle" && file) {
    return (
      <div className="space-y-3">
        <UploadProgress
          fileName={file.name}
          fileSize={file.size}
          progress={phase.name === "uploading" ? phase.progress : 100}
          onCancel={phase.name === "uploading" ? () => handle.current?.cancel() : undefined}
        />
        {phase.name === "submitting" && (
          <p role="status" className="text-ink-muted">
            Belgen kontrol ediliyor…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Banner tone="danger" title={error} live />}
      <FileDropzone
        label="Öğrenci belgesi (PDF)"
        hint="e-Devlet'ten indirdiğin öğrenci belgesini değiştirmeden yükle."
        maxBytes={VERIFICATION_MAX_BYTES}
        onFileAccepted={setFile}
        onFileCleared={() => setFile(null)}
      />
      <Button onClick={submit} disabled={!file}>
        Belgeyi gönder
      </Button>
    </div>
  );
}
