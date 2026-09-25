"use client";

import { NEED_LIMITS, type ParseNeedResponse } from "@kampusagi/contracts";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequiredNote } from "@/components/ui/RequiredNote";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { TextArea } from "@/components/ui/TextField";
import { NeedCard, type NeedCardData } from "@/components/need/NeedCard";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { useSignedIn } from "@/features/app/guards";
import { fromFormState, toFormState, type NeedFieldErrors, type NeedFormState } from "./form";
import { NeedFields } from "./NeedFields";
import {
  categoryLabels,
  failReasonMessages,
  formatMaskedKinds,
  formatParticipants,
  formatWhen,
} from "./labels";

type Step =
  | { name: "write" }
  | { name: "parsing" }
  | { name: "review"; result: ParseNeedResponse }
  | { name: "published"; needId: string };

const LOW_CONFIDENCE = 0.5;

function useFocusOnChange(key: string) {
  const ref = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus();
  }, [key]);
  return ref;
}

export function NeedComposer() {
  const { functions } = useConnectors();
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>({ name: "write" });
  const [error, setError] = useState<string | null>(null);
  const draft = useRef<{ id: string; text: string } | null>(null);
  const headingRef = useFocusOnChange(step.name);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < NEED_LIMITS.text.min) {
      setError(`İhtiyacını en az ${NEED_LIMITS.text.min} karakterle anlat.`);
      return;
    }
    if (draft.current?.text !== trimmed) draft.current = { id: crypto.randomUUID(), text: trimmed };
    setError(null);
    setStep({ name: "parsing" });
    try {
      const result = await functions.call("parseNeed", { draftId: draft.current.id, text: trimmed });
      setStep({ name: "review", result });
    } catch (caught) {
      setError(toAppError(caught).message);
      setStep({ name: "write" });
    }
  }

  function restart() {
    draft.current = null;
    setText("");
    setError(null);
    setStep({ name: "write" });
  }

  if (step.name === "published") {
    return (
      <Card as="section" aria-labelledby="need-published" className="flex flex-col items-start gap-4 p-6">
        <h2 id="need-published" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-ink">
          İlanın yayında
        </h2>
        <p className="text-ink-muted">Uygun öğrenciler ilanını Keşfet&apos;te görebilir.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/kesfet/ilan/${step.needId}`}>İlanı görüntüle</ButtonLink>
          <Button variant="secondary" onClick={restart}>
            Yeni ihtiyaç yaz
          </Button>
        </div>
      </Card>
    );
  }

  if (step.name === "review") {
    return (
      <NeedReview
        result={step.result}
        headingRef={headingRef}
        onBack={() => setStep({ name: "write" })}
        onPublished={(needId) => setStep({ name: "published", needId })}
      />
    );
  }

  const parsing = step.name === "parsing";
  return (
    <section aria-labelledby="need-write" className="flex flex-col gap-5">
      <h2 id="need-write" ref={headingRef} tabIndex={-1} className="sr-only">
        İhtiyacını anlat
      </h2>
      {error && <Banner tone="danger" title={error} live />}
      <form onSubmit={analyze} className="flex flex-col gap-4" noValidate>
        <RequiredNote />
        <TextArea
          label="Neye ihtiyacın var?"
          hint="Ne, ne zaman, kaç kişi ve nerede olduğunu yazman yeterli. Örn. “Yarın 18:00'de spor salonunda basket oynayacak 3 kişi arıyoruz.”"
          required
          rows={5}
          maxLength={NEED_LIMITS.text.max}
          value={text}
          disabled={parsing}
          onChange={(event) => setText(event.target.value)}
        />
        <p className="text-sm text-ink-muted">
          Metnin, alanları önermesi için yapay zekâ ile (Anthropic, yurt dışı) işlenir. Telefon, e-posta, TC kimlik ve
          IBAN gibi bilgiler gönderilmeden önce otomatik olarak gizlenir. Öneriler yalnızca taslaktır; yayımlamadan önce
          her alanı sen onaylarsın.{" "}
          <Link href="/aydinlatma-metni" className="font-semibold text-primary underline underline-offset-2">
            Aydınlatma Metni
          </Link>
        </p>
        <div>
          <Button type="submit" disabled={parsing}>
            {parsing ? "Hazırlanıyor…" : "Devam et"}
          </Button>
        </div>
      </form>
      {parsing && (
        <LoadingRegion label="İlanın hazırlanıyor…">
          <Card className="flex flex-col gap-3 p-5">
            <p className="font-semibold text-ink">İlanın hazırlanıyor…</p>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </Card>
        </LoadingRegion>
      )}
    </section>
  );
}

type NeedReviewProps = {
  result: ParseNeedResponse;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onPublished: (needId: string) => void;
};

function previewData(state: NeedFormState, author: NeedCardData["author"]): NeedCardData {
  const converted = fromFormState(state);
  const need = converted.ok ? converted.need : null;
  return {
    title: state.title.trim() || "Başlık",
    category: categoryLabels[state.category],
    tags: need?.tags ?? [],
    when: need ? formatWhen(need.when) : "Zaman belirtilmedi",
    participants: need ? formatParticipants(need.participants) : "—",
    location: state.locationHint.trim() || undefined,
    author,
  };
}

function NeedReview({ result, headingRef, onBack, onPublished }: NeedReviewProps) {
  const { functions } = useConnectors();
  const { profile } = useSignedIn();
  const [state, setState] = useState(() => toFormState(result.parsed));
  const [errors, setErrors] = useState<NeedFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const failure = result.failReason ? failReasonMessages[result.failReason] : null;
  const lowConfidence = result.status === "parsed" && result.confidence !== null && result.confidence < LOW_CONFIDENCE;

  async function publish(event: FormEvent) {
    event.preventDefault();
    const converted = fromFormState(state);
    if (!converted.ok) {
      setErrors(converted.errors);
      setError("Bazı alanları düzeltmen gerekiyor.");
      return;
    }
    setErrors({});
    setError(null);
    setPublishing(true);
    try {
      const { needId } = await functions.call("publishNeed", {
        draftId: result.draftId,
        visibility: state.visibility,
        need: converted.need,
      });
      onPublished(needId);
    } catch (caught) {
      setError(toAppError(caught).message);
      setPublishing(false);
    }
  }

  return (
    <section aria-labelledby="need-review" className="flex flex-col gap-5">
      <h2 id="need-review" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-ink">
        İlanını kontrol et
      </h2>
      {failure && (
        <Banner tone={result.publishable ? "warning" : "danger"} title={failure.title} live>
          {failure.description}
        </Banner>
      )}
      {lowConfidence && (
        <Banner tone="warning" title="Önerilerden emin değiliz">
          Alanları metninle karşılaştırıp gerekirse düzelt.
        </Banner>
      )}
      {result.clarifications.length > 0 && (
        <Banner tone="info" title="İlanını güçlendirmek için şunları ekleyebilirsin">
          <ul className="list-disc pl-5">
            {result.clarifications.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </Banner>
      )}
      {result.maskedKinds.length > 0 && (
        <Banner tone="info" title="Kişisel bilgilerin gizlendi">
          Gizliliğin için metnindeki {formatMaskedKinds(result.maskedKinds)} ilana eklenmedi.
        </Banner>
      )}
      {error && <Banner tone="danger" title={error} live />}
      {result.publishable ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form onSubmit={publish} noValidate className="flex flex-col gap-6">
            <RequiredNote />
            <NeedFields state={state} errors={errors} onChange={setState} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={publishing}>
                {publishing ? "Yayımlanıyor…" : "Yayınla"}
              </Button>
              <Button variant="secondary" onClick={onBack} disabled={publishing}>
                Metne dön
              </Button>
            </div>
          </form>
          <aside aria-labelledby="need-preview" className="flex flex-col gap-3">
            <h3 id="need-preview" className="font-semibold text-ink-muted">
              Önizleme
            </h3>
            <NeedCard
              pinned
              need={previewData(state, { name: profile.displayName, department: profile.department, verified: true })}
            />
            <details className="text-sm text-ink-muted">
              <summary className="cursor-pointer font-semibold">İlanda saklanacak metin</summary>
              <p className="mt-2 whitespace-pre-line">{result.maskedText}</p>
            </details>
          </aside>
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={onBack}>
            Metne dön
          </Button>
        </div>
      )}
    </section>
  );
}
