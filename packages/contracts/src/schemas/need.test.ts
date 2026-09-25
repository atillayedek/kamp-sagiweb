import { describe, expect, it } from "vitest";
import { parseNeedRequestSchema, parsedNeedSchema, publishNeedRequestSchema, type ParsedNeedInput } from "./need";

const base: ParsedNeedInput = {
  title: "Yarın akşam basketbol",
  category: "spor",
  tags: ["Basketbol", "basketbol", "Işık"],
  requiredSkills: [],
  participants: { min: 2, max: 4 },
  when: { kind: "exact", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: "yarın 18:00" },
  locationHint: "Spor salonu",
};

describe("parsedNeedSchema", () => {
  it("etiketleri tr-TR küçük harfe çevirip tekilleştirir", () => {
    const result = parsedNeedSchema.parse(base);
    expect(result.tags).toEqual(["basketbol", "ışık"]);
  });

  it("bilinmeyen alanları reddeder", () => {
    expect(parsedNeedSchema.safeParse({ ...base, role: "admin" }).success).toBe(false);
  });

  it("kategori listesi dışındaki değeri reddeder", () => {
    expect(parsedNeedSchema.safeParse({ ...base, category: "yonetici" }).success).toBe(false);
  });

  it("katılımcı aralığını doğrular", () => {
    expect(parsedNeedSchema.safeParse({ ...base, participants: { min: 5, max: 2 } }).success).toBe(false);
    expect(parsedNeedSchema.safeParse({ ...base, participants: { min: 0, max: 2 } }).success).toBe(false);
    expect(parsedNeedSchema.safeParse({ ...base, participants: { min: 1, max: 51 } }).success).toBe(false);
    expect(parsedNeedSchema.safeParse({ ...base, participants: { min: 1.5, max: 2 } }).success).toBe(false);
  });

  it.each([
    [{ kind: "exact", startIso: null, endIso: null, rawText: null }],
    [{ kind: "range", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: null }],
    [{ kind: "range", startIso: "2026-09-26T18:00:00+03:00", endIso: "2026-09-26T17:00:00+03:00", rawText: null }],
    [{ kind: "none", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: null }],
    [{ kind: "flexible", startIso: null, endIso: "2026-09-26T18:00:00+03:00", rawText: "hafta içi" }],
    [{ kind: "exact", startIso: "2026-09-26T18:00:00+03:00", endIso: "2026-09-26T19:00:00+03:00", rawText: null }],
    [{ kind: "exact", startIso: "2026-09-26T18:00:00", endIso: null, rawText: null }],
  ])("tutarsız zaman bilgisini reddeder: %j", (when) => {
    expect(parsedNeedSchema.safeParse({ ...base, when }).success).toBe(false);
  });

  it("geçerli zaman aralığını kabul eder", () => {
    const when = { kind: "range", startIso: "2026-09-26T18:00:00+03:00", endIso: "2026-09-26T20:00:00+03:00", rawText: null };
    expect(parsedNeedSchema.safeParse({ ...base, when }).success).toBe(true);
  });

  it("kontrol karakteri içeren başlığı reddeder", () => {
    expect(parsedNeedSchema.safeParse({ ...base, title: "Basket\u0007bol" }).success).toBe(false);
  });
});

describe("parseNeedRequestSchema", () => {
  it("metin uzunluğunu sınırlar", () => {
    expect(parseNeedRequestSchema.safeParse({ draftId: "draft-12345", text: "kısa" }).success).toBe(false);
    expect(parseNeedRequestSchema.safeParse({ draftId: "draft-12345", text: "a".repeat(1001) }).success).toBe(false);
    expect(parseNeedRequestSchema.safeParse({ draftId: "draft-12345", text: "Yarın basket oynayacak 3 kişi arıyorum" }).success).toBe(true);
  });

  it("geçersiz taslak kimliğini reddeder", () => {
    expect(parseNeedRequestSchema.safeParse({ draftId: "../x", text: "Yarın basket oynayacak 3 kişi arıyorum" }).success).toBe(false);
  });
});

describe("publishNeedRequestSchema", () => {
  it("görünürlüğü yalnızca campus veya global kabul eder", () => {
    expect(publishNeedRequestSchema.safeParse({ draftId: "draft-12345", visibility: "campus", need: base }).success).toBe(true);
    expect(publishNeedRequestSchema.safeParse({ draftId: "draft-12345", visibility: "herkes", need: base }).success).toBe(false);
  });

  it("sunucu alanlarını kabul etmez", () => {
    expect(
      publishNeedRequestSchema.safeParse({ draftId: "draft-12345", visibility: "campus", need: base, authorUid: "x" }).success,
    ).toBe(false);
  });
});
