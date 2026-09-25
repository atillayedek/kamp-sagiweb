import {
  isoDateTimeSchema,
  NEED_LIMITS,
  parsedNeedSchema,
  type NeedWhen,
  type ParsedNeed,
} from "@kampusagi/contracts";
import type { AiNeedOutput } from "../ai/need-output";
import { cleanLine, maskPii, truncateText } from "./text";

const DAY_MS = 24 * 60 * 60 * 1000;
const WHEN_QUESTION = "İhtiyacın hangi tarih ve saatte?";

function line(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const result = truncateText(maskPii(cleanLine(value)).text, max);
  return result.length > 0 ? result : null;
}

function labels(values: string[]): string[] {
  return values
    .map((value) => line(value.replace(/^#+/u, ""), NEED_LIMITS.tags.itemMax))
    .filter((value): value is string => value !== null)
    .slice(0, NEED_LIMITS.tags.max * 2);
}

function count(value: number): number {
  if (!Number.isFinite(value)) return NEED_LIMITS.participants.min;
  return Math.min(NEED_LIMITS.participants.max, Math.max(NEED_LIMITS.participants.min, Math.round(value)));
}

function plausibleInstant(value: string | null, now: Date): string | null {
  if (!value || !isoDateTimeSchema.safeParse(value).success) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time < now.getTime() - DAY_MS || time > now.getTime() + 366 * DAY_MS) return null;
  return value;
}

function normalizeWhen(when: AiNeedOutput["when"], now: Date): { when: NeedWhen; dropped: boolean } {
  const rawText = line(when.rawText, NEED_LIMITS.whenText.max);
  const start = plausibleInstant(when.startIso, now);
  let end = plausibleInstant(when.endIso, now);
  if (start && end && Date.parse(end) < Date.parse(start)) end = null;
  const dropped = (when.startIso !== null && !start) || (when.endIso !== null && !end);
  const loose = rawText ? "flexible" : "none";
  if (when.kind === "range" && start && end) return { when: { kind: "range", startIso: start, endIso: end, rawText }, dropped };
  if ((when.kind === "range" || when.kind === "exact") && start) {
    return { when: { kind: "exact", startIso: start, endIso: null, rawText }, dropped };
  }
  const kind = when.kind === "none" ? "none" : loose;
  return { when: { kind, startIso: null, endIso: null, rawText }, dropped };
}

export function fallbackTitle(maskedText: string): string {
  const firstLine = cleanLine(maskedText.split("\n")[0] ?? "");
  const candidate = truncateText(firstLine.length >= NEED_LIMITS.title.min ? firstLine : cleanLine(maskedText), NEED_LIMITS.title.max);
  return candidate.length >= NEED_LIMITS.title.min ? candidate : "İhtiyaç ilanı";
}

export function manualDraft(maskedText: string): ParsedNeed {
  return parsedNeedSchema.parse({
    title: fallbackTitle(maskedText),
    category: "diger",
    tags: [],
    requiredSkills: [],
    participants: { min: 1, max: 1 },
    when: { kind: "none", startIso: null, endIso: null, rawText: null },
    locationHint: null,
  });
}

export type NormalizedExtraction = { parsed: ParsedNeed; confidence: number; clarifications: string[] };

export function normalizeExtraction(output: AiNeedOutput, now: Date, maskedText: string): NormalizedExtraction {
  const title = line(output.title, NEED_LIMITS.title.max);
  const min = count(output.participants.min);
  const max = Math.max(min, count(output.participants.max));
  const { when, dropped } = normalizeWhen(output.when, now);
  const parsed = parsedNeedSchema.parse({
    title: title && title.length >= NEED_LIMITS.title.min ? title : fallbackTitle(maskedText),
    category: output.category,
    tags: [...new Set(labels(output.tags).map((tag) => tag.toLocaleLowerCase("tr-TR")))].slice(0, NEED_LIMITS.tags.max),
    requiredSkills: [...new Set(labels(output.requiredSkills).map((skill) => skill.toLocaleLowerCase("tr-TR")))].slice(
      0,
      NEED_LIMITS.tags.max,
    ),
    participants: { min, max },
    when,
    locationHint: line(output.locationHint, NEED_LIMITS.locationHint.max),
  });
  const questions = output.needsClarification
    .map((question) => line(question, NEED_LIMITS.clarifications.itemMax))
    .filter((question): question is string => question !== null);
  if (dropped && !questions.includes(WHEN_QUESTION)) questions.unshift(WHEN_QUESTION);
  const confidence = Number.isFinite(output.confidence) ? Math.min(1, Math.max(0, output.confidence)) : 0;
  return { parsed, confidence, clarifications: questions.slice(0, NEED_LIMITS.clarifications.max) };
}
