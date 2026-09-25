import { describe, expect, it } from "vitest";
import type { AiNeedOutput } from "../ai/need-output";
import { fallbackTitle, manualDraft, normalizeExtraction } from "./normalize";

const NOW = new Date("2026-09-25T11:30:00Z");

const output = (overrides: Partial<AiNeedOutput> = {}): AiNeedOutput => ({
  title: "Yarın akşam basketbol",
  category: "spor",
  tags: ["#Basketbol", "basketbol", "  kampüs  "],
  requiredSkills: ["Basketbol"],
  participants: { min: 3, max: 3 },
  when: { kind: "exact", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: "yarın 18:00" },
  locationHint: "Spor salonu",
  confidence: 0.9,
  needsClarification: [],
  ...overrides,
});

describe("normalizeExtraction", () => {
  it("geçerli çıktıyı ilan alanlarına dönüştürür", () => {
    const result = normalizeExtraction(output(), NOW, "metin");
    expect(result.parsed).toEqual({
      title: "Yarın akşam basketbol",
      category: "spor",
      tags: ["basketbol", "kampüs"],
      requiredSkills: ["basketbol"],
      participants: { min: 3, max: 3 },
      when: { kind: "exact", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: "yarın 18:00" },
      locationHint: "Spor salonu",
    });
    expect(result.confidence).toBe(0.9);
  });

  it("çıktıdaki kişisel bilgileri yeniden gizler", () => {
    const result = normalizeExtraction(output({ title: "Ara 0532 123 45 67", locationHint: "ali@ornek.com" }), NOW, "metin");
    expect(result.parsed.title).toBe("Ara [telefon]");
    expect(result.parsed.locationHint).toBe("[e-posta]");
  });

  it("aşırı uzun alanları kısaltır ve listeleri sınırlar", () => {
    const result = normalizeExtraction(
      output({
        title: "çok ".repeat(60),
        tags: Array.from({ length: 20 }, (_, index) => `etiket${index}`),
        needsClarification: ["a?", "b?", "c?", "d?"],
      }),
      NOW,
      "metin",
    );
    expect(result.parsed.title.length).toBeLessThanOrEqual(80);
    expect(result.parsed.tags).toHaveLength(8);
    expect(result.clarifications).toHaveLength(3);
  });

  it("kişi sayısını sınırlar ve sıralar", () => {
    expect(normalizeExtraction(output({ participants: { min: 0, max: 500 } }), NOW, "m").parsed.participants).toEqual({
      min: 1,
      max: 50,
    });
    expect(normalizeExtraction(output({ participants: { min: 6, max: 2.4 } }), NOW, "m").parsed.participants).toEqual({
      min: 6,
      max: 6,
    });
    expect(
      normalizeExtraction(output({ participants: { min: Number.NaN, max: Number.NaN } }), NOW, "m").parsed.participants,
    ).toEqual({ min: 1, max: 1 });
  });

  it("geçersiz veya geçmiş tarihi düşürüp soru ekler", () => {
    for (const startIso of ["yarın", "2026-09-20T18:00:00+03:00", "2026-09-26T18:00:00", "2031-01-01T10:00:00+03:00"]) {
      const result = normalizeExtraction(
        output({ when: { kind: "exact", startIso, endIso: null, rawText: "yarın" } }),
        NOW,
        "m",
      );
      expect(result.parsed.when).toEqual({ kind: "flexible", startIso: null, endIso: null, rawText: "yarın" });
      expect(result.clarifications[0]).toBe("İhtiyacın hangi tarih ve saatte?");
    }
  });

  it("bitişi başlangıçtan önce olan aralığı tek zamana indirger", () => {
    const result = normalizeExtraction(
      output({
        when: { kind: "range", startIso: "2026-09-26T18:00:00+03:00", endIso: "2026-09-26T17:00:00+03:00", rawText: null },
      }),
      NOW,
      "m",
    );
    expect(result.parsed.when).toEqual({ kind: "exact", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: null });
  });

  it("esnek zamanda tarihleri temizler", () => {
    const result = normalizeExtraction(
      output({ when: { kind: "flexible", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: "hafta içi" } }),
      NOW,
      "m",
    );
    expect(result.parsed.when).toEqual({ kind: "flexible", startIso: null, endIso: null, rawText: "hafta içi" });
  });

  it("boş başlıkta metnin ilk satırını kullanır", () => {
    expect(normalizeExtraction(output({ title: "  " }), NOW, "Kütüphanede çalışma\nikinci satır").parsed.title).toBe(
      "Kütüphanede çalışma",
    );
  });

  it("güveni 0-1 aralığına sıkıştırır", () => {
    expect(normalizeExtraction(output({ confidence: 7 }), NOW, "m").confidence).toBe(1);
    expect(normalizeExtraction(output({ confidence: -1 }), NOW, "m").confidence).toBe(0);
  });
});

describe("manualDraft", () => {
  it("elle doldurma için güvenli varsayılanlar üretir", () => {
    expect(manualDraft("Proje için ekip arıyorum\ndetaylar")).toEqual({
      title: "Proje için ekip arıyorum",
      category: "diger",
      tags: [],
      requiredSkills: [],
      participants: { min: 1, max: 1 },
      when: { kind: "none", startIso: null, endIso: null, rawText: null },
      locationHint: null,
    });
  });

  it("çok kısa ilk satırda tüm metne döner", () => {
    expect(fallbackTitle("a\nkütüphanede çalışacak arkadaş")).toBe("a kütüphanede çalışacak arkadaş");
  });
});
