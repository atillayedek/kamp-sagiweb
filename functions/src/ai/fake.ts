import { formatZonedIso, zonedLocalToDate, zonedParts, type NeedCategory } from "@kampusagi/contracts";
import type { AiNeedOutput } from "./need-output";
import type { NeedExtractor } from "./types";

const CATEGORY_KEYWORDS: [NeedCategory, string[]][] = [
  ["spor", ["basket", "futbol", "voleybol", "tenis", "maç", "koşu", "spor"]],
  ["ders", ["ders", "sınav", "ödev", "vize", "final", "çalış"]],
  ["proje", ["proje", "takım", "hackathon"]],
  ["ulasim", ["yol arkadaşı", "araba", "otobüs", "ulaşım"]],
  ["esya", ["ödünç", "kitap", "hesap makinesi", "eşya"]],
  ["etkinlik", ["konser", "etkinlik", "gezi", "sinema"]],
];

const USAGE = { inputTokens: 0, outputTokens: 0 };

function fakeOutput(text: string, now: Date): AiNeedOutput {
  const lower = text.toLocaleLowerCase("tr-TR");
  const matches = CATEGORY_KEYWORDS.filter(([, words]) => words.some((word) => lower.includes(word)));
  const tags = [...new Set(matches.flatMap(([, words]) => words.filter((word) => lower.includes(word))))];
  const count = /(\d{1,2})\s*kişi/u.exec(lower);
  const participants = count ? Number(count[1]) : 1;
  const time = /(\d{1,2})[:.](\d{2})/u.exec(lower);
  let when: AiNeedOutput["when"] = { kind: "none", startIso: null, endIso: null, rawText: null };
  if (lower.includes("yarın")) {
    if (time) {
      const today = zonedParts(now);
      const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
      const start = zonedLocalToDate({
        year: tomorrow.getUTCFullYear(),
        month: tomorrow.getUTCMonth() + 1,
        day: tomorrow.getUTCDate(),
        hour: Number(time[1]),
        minute: Number(time[2]),
      });
      when = { kind: "exact", startIso: formatZonedIso(start), endIso: null, rawText: `yarın ${time[0]}` };
    } else {
      when = { kind: "flexible", startIso: null, endIso: null, rawText: "yarın" };
    }
  }
  return {
    title: text.split(/[.!?\n]/u)[0] ?? text,
    category: matches[0]?.[0] ?? "diger",
    tags,
    requiredSkills: [],
    participants: { min: participants, max: participants },
    when,
    locationHint: lower.includes("kütüphane") ? "kütüphane" : null,
    confidence: matches.length > 0 ? 0.8 : 0.4,
    needsClarification: when.kind === "none" ? ["Ne zaman buluşmak istiyorsun?"] : [],
  };
}

export function createFakeNeedExtractor(): NeedExtractor {
  return {
    async extractNeed({ text, now }) {
      if (text.includes("#sahte-ret")) return { ok: false, reason: "refusal", usage: USAGE };
      if (text.includes("#sahte-hata")) return { ok: false, reason: "invalid-output", usage: USAGE };
      return { ok: true, output: fakeOutput(text, now), usage: { inputTokens: 400, outputTokens: 120 }, model: "fake" };
    },
  };
}
