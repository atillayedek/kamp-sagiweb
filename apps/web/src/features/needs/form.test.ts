import { describe, expect, it } from "vitest";
import { fromFormState, fromLocalInput, toFormState, toLocalInput, type NeedFormState } from "./form";
import { formatMaskedKinds, formatParticipants, formatWhen } from "./labels";

const parsed = {
  title: "Yarın akşam basketbol",
  category: "spor" as const,
  tags: ["basketbol", "kampüs"],
  requiredSkills: [],
  participants: { min: 2, max: 4 },
  when: { kind: "exact" as const, startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: "yarın 18:00" },
  locationHint: "Spor salonu",
};

describe("need form dönüşümleri", () => {
  it("İstanbul saatini datetime-local değerine ve geri çevirir", () => {
    expect(toLocalInput("2026-09-26T15:00:00Z")).toBe("2026-09-26T18:00");
    expect(fromLocalInput("2026-09-26T18:00")).toBe("2026-09-26T18:00:00+03:00");
    expect(fromLocalInput("26.09.2026 18:00")).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });

  it("ayrıştırılmış ilanı form durumuna ve geri dönüştürür", () => {
    const state = toFormState(parsed);
    expect(state).toMatchObject({ tags: "basketbol, kampüs", participantsMin: "2", whenStart: "2026-09-26T18:00", visibility: "campus" });
    expect(fromFormState(state)).toEqual({ ok: true, need: parsed });
  });

  it("zaman türüne göre gereksiz tarihleri göndermez", () => {
    const state: NeedFormState = { ...toFormState(parsed), whenKind: "flexible", whenText: "hafta içi akşamları" };
    const result = fromFormState(state);
    expect(result.ok && result.need.when).toEqual({ kind: "flexible", startIso: null, endIso: null, rawText: "hafta içi akşamları" });
  });

  it("alan hatalarını form alanlarına eşler", () => {
    const state: NeedFormState = {
      ...toFormState(parsed),
      title: "a",
      participantsMin: "5",
      participantsMax: "2",
      whenKind: "range",
      whenEnd: "",
      locationHint: "x".repeat(81),
    };
    const result = fromFormState(state);
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["locationHint", "participants", "title", "whenEnd"]);
  });

  it("sayı olmayan kişi sayısını reddeder", () => {
    const result = fromFormState({ ...toFormState(parsed), participantsMin: "iki" });
    expect(!result.ok && result.errors.participants).toBeTruthy();
  });
});

describe("need etiketleri", () => {
  it("zamanı okunur biçimde yazar", () => {
    expect(formatWhen(parsed.when)).toBe("26 Eyl 2026 18:00");
    expect(formatWhen({ kind: "flexible", startIso: null, endIso: null, rawText: "hafta içi" })).toBe("hafta içi");
    expect(formatWhen({ kind: "none", startIso: null, endIso: null, rawText: null })).toBe("Zaman belirtilmedi");
  });

  it("kişi sayısını yazar", () => {
    expect(formatParticipants({ min: 3, max: 3 })).toBe("3 kişi");
    expect(formatParticipants({ min: 2, max: 4 })).toBe("2–4 kişi");
  });

  it("gizlenen bilgi türlerini Türkçe listeler", () => {
    expect(formatMaskedKinds(["phone"])).toBe("telefon numarası");
    expect(formatMaskedKinds(["phone", "email", "iban"])).toBe("telefon numarası, e-posta adresi ve IBAN / hesap numarası");
  });
});
