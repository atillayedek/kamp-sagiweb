"use client";

import {
  COMMUNITY_LIMITS,
  createClubRequestSchema,
  createEventRequestSchema,
  type Visibility,
} from "@kampusagi/contracts";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { RequiredNote } from "@/components/ui/RequiredNote";
import { TextArea, TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useConnectors } from "@/connectors/ConnectorsProvider";
import { toAppError } from "@/connectors/errors";
import { visibilityLabels } from "@/features/needs/labels";
import { fromLocalInput } from "@/features/needs/form";

const visibilityOptions = (["campus", "global"] as const).map((value) => ({
  value,
  label: visibilityLabels[value].title,
  description: visibilityLabels[value].description,
}));

type Errors<K extends string> = Partial<Record<K, string>>;

function firstErrors<K extends string>(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>, messages: Record<K, string>) {
  const result: Errors<K> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && field in messages && !result[field as K]) result[field as K] = messages[field as K];
  }
  return result;
}

function useRequestId() {
  const [id] = useState(() => crypto.randomUUID());
  return id;
}

type ClubField = "name" | "description";

const clubMessages: Record<ClubField, string> = {
  name: `Kulüp adı ${COMMUNITY_LIMITS.clubName.min}–${COMMUNITY_LIMITS.clubName.max} karakter olmalı.`,
  description: `Tanıtım ${COMMUNITY_LIMITS.clubDescription.min}–${COMMUNITY_LIMITS.clubDescription.max} karakter olmalı.`,
};

export function ClubForm() {
  const { functions } = useConnectors();
  const toast = useToast();
  const router = useRouter();
  const clubId = useRequestId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("campus");
  const [errors, setErrors] = useState<Errors<ClubField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const input = createClubRequestSchema.safeParse({ clubId, name, description, visibility });
    if (!input.success) {
      setErrors(firstErrors(input.error.issues, clubMessages));
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    try {
      await functions.call("createClub", input.data);
      toast.show({ title: "Kulübün kuruldu", description: "Kurucu olarak üyesin.", tone: "success" });
      router.push("/topluluklar?sekme=kulupler");
    } catch (error) {
      setFormError(toAppError(error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <RequiredNote />
        <TextField
          label="Kulüp adı"
          required
          maxLength={COMMUNITY_LIMITS.clubName.max}
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextArea
          label="Tanıtım"
          hint="Kulübün ne yaptığını ve kimleri beklediğini anlat. Kişisel iletişim bilgisi yazma."
          required
          rows={4}
          maxLength={COMMUNITY_LIMITS.clubDescription.max}
          value={description}
          error={errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <RadioGroup legend="Kimler görsün?" value={visibility} options={visibilityOptions} onChange={setVisibility} />
        {formError && (
          <p role="alert" className="font-medium text-danger">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" aria-disabled={busy || undefined}>
            {busy ? "Kuruluyor…" : "Kulübü kur"}
          </Button>
          <ButtonLink href="/topluluklar?sekme=kulupler" variant="secondary">
            Vazgeç
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}

type EventField = "title" | "description" | "location" | "startsAt" | "endsAt";

const eventMessages: Record<EventField, string> = {
  title: `Başlık ${COMMUNITY_LIMITS.eventTitle.min}–${COMMUNITY_LIMITS.eventTitle.max} karakter olmalı.`,
  description: `Açıklama en fazla ${COMMUNITY_LIMITS.eventDescription.max} karakter olabilir.`,
  location: `Yer ${COMMUNITY_LIMITS.eventLocation.min}–${COMMUNITY_LIMITS.eventLocation.max} karakter olmalı.`,
  startsAt: "Başlangıç tarihini ve saatini seç.",
  endsAt: `Bitiş, başlangıçtan sonra ve en fazla ${COMMUNITY_LIMITS.eventMaxDurationHours} saat içinde olmalı.`,
};

export function EventForm() {
  const { functions } = useConnectors();
  const toast = useToast();
  const router = useRouter();
  const eventId = useRequestId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("campus");
  const [errors, setErrors] = useState<Errors<EventField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const input = createEventRequestSchema.safeParse({
      eventId,
      title,
      description,
      location,
      startsAt: fromLocalInput(start),
      endsAt: end ? fromLocalInput(end) : null,
      visibility,
    });
    if (!input.success) {
      setErrors(firstErrors(input.error.issues, eventMessages));
      return;
    }
    setErrors({});
    setFormError(null);
    setBusy(true);
    try {
      await functions.call("createEvent", input.data);
      toast.show({ title: "Etkinliğin oluşturuldu", description: "Düzenleyen olarak katılımcı listesindesin.", tone: "success" });
      router.push("/topluluklar?sekme=etkinlikler");
    } catch (error) {
      setFormError(toAppError(error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <RequiredNote />
        <TextField
          label="Başlık"
          required
          maxLength={COMMUNITY_LIMITS.eventTitle.max}
          value={title}
          error={errors.title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Başlangıç"
            type="datetime-local"
            required
            value={start}
            error={errors.startsAt}
            onChange={(event) => setStart(event.target.value)}
          />
          <TextField
            label="Bitiş (isteğe bağlı)"
            type="datetime-local"
            value={end}
            error={errors.endsAt}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
        <TextField
          label="Yer"
          hint="Örn. Merkez kütüphane giriş katı"
          required
          maxLength={COMMUNITY_LIMITS.eventLocation.max}
          value={location}
          error={errors.location}
          onChange={(event) => setLocation(event.target.value)}
        />
        <TextArea
          label="Açıklama (isteğe bağlı)"
          hint="Kişisel iletişim bilgisi yazma."
          rows={4}
          maxLength={COMMUNITY_LIMITS.eventDescription.max}
          value={description}
          error={errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <RadioGroup legend="Kimler görsün?" value={visibility} options={visibilityOptions} onChange={setVisibility} />
        {formError && (
          <p role="alert" className="font-medium text-danger">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" aria-disabled={busy || undefined}>
            {busy ? "Oluşturuluyor…" : "Etkinliği oluştur"}
          </Button>
          <ButtonLink href="/topluluklar?sekme=etkinlikler" variant="secondary">
            Vazgeç
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}
