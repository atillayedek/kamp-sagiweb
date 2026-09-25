import {
  formatZonedIso,
  NEED_LIMITS,
  parsedNeedSchema,
  zonedLocalToDate,
  zonedParts,
  type NeedCategory,
  type NeedWhenKind,
  type ParsedNeedInput,
  type Visibility,
} from "@kampusagi/contracts";
import { formatTagInput, parseTagInput } from "@/features/profile/tags";

export type NeedFormState = {
  title: string;
  category: NeedCategory;
  tags: string;
  requiredSkills: string;
  participantsMin: string;
  participantsMax: string;
  whenKind: NeedWhenKind;
  whenStart: string;
  whenEnd: string;
  whenText: string;
  locationHint: string;
  visibility: Visibility;
};

export type NeedField = Exclude<keyof NeedFormState, "visibility" | "participantsMin" | "participantsMax" | "whenKind"> | "participants";

export type NeedFieldErrors = Partial<Record<NeedField, string>>;

type ParsedView = {
  title: string;
  category: NeedCategory;
  tags: string[];
  requiredSkills: string[];
  participants: { min: number; max: number };
  when: { kind: NeedWhenKind; startIso: string | null; endIso: string | null; rawText: string | null };
  locationHint: string | null;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = zonedParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function fromLocalInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number];
  return formatZonedIso(zonedLocalToDate({ year, month, day, hour, minute }));
}

export function toFormState(parsed: ParsedView, visibility: Visibility = "campus"): NeedFormState {
  return {
    title: parsed.title,
    category: parsed.category,
    tags: formatTagInput(parsed.tags),
    requiredSkills: formatTagInput(parsed.requiredSkills),
    participantsMin: String(parsed.participants.min),
    participantsMax: String(parsed.participants.max),
    whenKind: parsed.when.kind,
    whenStart: toLocalInput(parsed.when.startIso),
    whenEnd: toLocalInput(parsed.when.endIso),
    whenText: parsed.when.rawText ?? "",
    locationHint: parsed.locationHint ?? "",
    visibility,
  };
}

const messages: Record<NeedField, string> = {
  title: `Başlık ${NEED_LIMITS.title.min}–${NEED_LIMITS.title.max} karakter olmalı.`,
  category: "Bir kategori seç.",
  tags: `En fazla ${NEED_LIMITS.tags.max} etiket ekleyebilirsin; her biri en fazla ${NEED_LIMITS.tags.itemMax} karakter.`,
  requiredSkills: `En fazla ${NEED_LIMITS.tags.max} beceri ekleyebilirsin; her biri en fazla ${NEED_LIMITS.tags.itemMax} karakter.`,
  participants: `Kişi sayısı ${NEED_LIMITS.participants.min}–${NEED_LIMITS.participants.max} arasında olmalı; en fazla, en azdan küçük olamaz.`,
  whenStart: "Geçerli bir başlangıç tarihi ve saati gir.",
  whenEnd: "Bitiş, başlangıçtan sonra olmalı.",
  whenText: `Zaman açıklaması en fazla ${NEED_LIMITS.whenText.max} karakter olabilir.`,
  locationHint: `Konum en fazla ${NEED_LIMITS.locationHint.max} karakter olabilir.`,
};

const whenFields: Record<string, NeedField> = { startIso: "whenStart", endIso: "whenEnd", rawText: "whenText" };

function toInteger(value: string): number {
  return /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
}

export type NeedFormResult = { ok: true; need: ParsedNeedInput } | { ok: false; errors: NeedFieldErrors };

export function fromFormState(state: NeedFormState): NeedFormResult {
  const timed = state.whenKind === "exact" || state.whenKind === "range";
  const need: ParsedNeedInput = {
    title: state.title,
    category: state.category,
    tags: parseTagInput(state.tags),
    requiredSkills: parseTagInput(state.requiredSkills),
    participants: { min: toInteger(state.participantsMin), max: toInteger(state.participantsMax) },
    when: {
      kind: state.whenKind,
      startIso: timed ? fromLocalInput(state.whenStart) : null,
      endIso: state.whenKind === "range" ? fromLocalInput(state.whenEnd) : null,
      rawText: state.whenText.trim() || null,
    },
    locationHint: state.locationHint.trim() || null,
  };
  const result = parsedNeedSchema.safeParse(need);
  if (result.success) return { ok: true, need };
  const errors: NeedFieldErrors = {};
  for (const issue of result.error.issues) {
    const [root, child] = issue.path;
    const field = root === "when" ? whenFields[String(child)] : (String(root) as NeedField);
    if (field && field in messages) errors[field] = messages[field];
  }
  return { ok: false, errors };
}
