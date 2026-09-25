import type {
  MaskedPiiKind,
  NeedCategory,
  NeedFailReason,
  NeedWhenKind,
  Visibility,
} from "@kampusagi/contracts";
import { formatDateTime } from "@/lib/date";

export const categoryLabels: Record<NeedCategory, string> = {
  ders: "Ders çalışma",
  proje: "Proje / takım",
  spor: "Spor",
  etkinlik: "Etkinlik",
  ulasim: "Yol arkadaşlığı",
  esya: "Eşya paylaşımı",
  yardim: "Yardım",
  diger: "Diğer",
};

export const whenKindLabels: Record<NeedWhenKind, string> = {
  none: "Belirtilmedi",
  exact: "Belirli bir zaman",
  range: "Zaman aralığı",
  flexible: "Esnek",
};

export const visibilityLabels: Record<Visibility, { title: string; description: string }> = {
  campus: { title: "Yalnızca kampüsüm", description: "Sadece üniversitendeki doğrulanmış öğrenciler görür." },
  global: { title: "Tüm üniversiteler", description: "Tüm doğrulanmış öğrenciler görür." },
};

const maskedKindLabels: Record<MaskedPiiKind, string> = {
  phone: "telefon numarası",
  email: "e-posta adresi",
  tckn: "TC kimlik numarası",
  iban: "IBAN / hesap numarası",
};

export const failReasonMessages: Record<NeedFailReason, { title: string; description: string }> = {
  "ai-error": {
    title: "Metnini şu an işleyemedik",
    description: "Alanları kendin doldurup ilanını yine de yayımlayabilirsin.",
  },
  quota: {
    title: "Bugünlük otomatik doldurma hakkın doldu",
    description: "Alanları kendin doldurup ilanını yine de yayımlayabilirsin.",
  },
  budget: {
    title: "Otomatik doldurma şu an kullanılamıyor",
    description: "Alanları kendin doldurup ilanını yine de yayımlayabilirsin.",
  },
  refusal: {
    title: "Bu metin işlenemedi ve yayımlanamaz",
    description: "İhtiyacını topluluk kurallarına uygun şekilde yeniden yaz.",
  },
};

export function formatMaskedKinds(kinds: readonly MaskedPiiKind[]): string {
  const labels = kinds.map((kind) => maskedKindLabels[kind]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} ve ${labels.at(-1)}`;
}

type WhenView = { kind: NeedWhenKind; startIso: string | null; endIso: string | null; rawText: string | null };

export function formatWhen(when: WhenView): string {
  if (when.kind === "exact" && when.startIso) return formatDateTime(when.startIso);
  if (when.kind === "range" && when.startIso && when.endIso) {
    return `${formatDateTime(when.startIso)} – ${formatDateTime(when.endIso)}`;
  }
  if (when.kind === "flexible" && when.rawText) return when.rawText;
  return "Zaman belirtilmedi";
}

export function formatParticipants(participants: { min: number; max: number }): string {
  return participants.min === participants.max
    ? `${participants.min} kişi`
    : `${participants.min}–${participants.max} kişi`;
}
