import { createHash } from "node:crypto";
import {
  callableTimeoutSeconds,
  NEED_DRAFT_TTL_HOURS,
  NEED_LIMITS,
  parsedNeedSchema,
  zonedDayKey,
  type NeedFailReason,
  type ParsedNeed,
  type ParseNeedResponse,
  type Visibility,
} from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { ExtractionFailure, NeedExtraction, NeedExtractor, TokenUsage } from "../ai/types";
import { appError } from "../lib/errors";
import { requireVerifiedProfile } from "../lib/profile";
import { rateLimitExpiry } from "../lib/rate-limit";
import { reserveTokens, settleTokens } from "./budget";
import { manualDraft, normalizeExtraction } from "./normalize";
import { cleanLine, cleanNeedText, maskPii, truncateText } from "./text";

export type NeedLimits = {
  dailyAiParses: number;
  dailyDrafts: number;
  dailyPublishes: number;
  dailyTokenBudget: number;
};

export type NeedDeps = {
  firestore: Firestore;
  extractor: NeedExtractor;
  limits: NeedLimits;
  now?: () => Date;
  retryWindowMs?: number;
};

const HOUR_MS = 60 * 60 * 1000;
const STALE_PENDING_MS = (callableTimeoutSeconds("parseNeed") + 10) * 1000;
const RETRY_WINDOW_MS = 30_000;
const UNCERTAIN_BILLING = new Set<ExtractionFailure>(["timeout", "unavailable"]);

type Draft = {
  uid: string;
  textHash: string;
  maskedText: string;
  maskedKinds: ParseNeedResponse["maskedKinds"];
  status: "pending" | "parsed" | "failed";
  failReason: NeedFailReason | null;
  parsed: ParsedNeed | null;
  confidence: number | null;
  clarifications: string[];
  publishable: boolean;
  publishedNeedId: string | null;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
};

type DraftUpdate = Partial<Draft> & { model: string | null; attempts: number };

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function responseFrom(draftId: string, draft: Draft): ParseNeedResponse {
  return {
    draftId,
    status: draft.status === "parsed" ? "parsed" : "failed",
    failReason: draft.failReason,
    parsed: draft.parsed ?? manualDraft(draft.maskedText),
    confidence: draft.confidence,
    clarifications: draft.clarifications,
    maskedKinds: draft.maskedKinds,
    maskedText: draft.maskedText,
    publishable: draft.publishable,
  };
}

function userLimitRef(firestore: Firestore, uid: string, now: Date) {
  return firestore.doc(`rateLimits/needs_${uid}_${zonedDayKey(now)}`);
}

function reusable(draft: Draft, now: Date): boolean {
  if (draft.publishedNeedId) return true;
  if (draft.status === "pending" || draft.expiresAt.toMillis() <= now.getTime()) return false;
  return draft.status === "parsed" || draft.failReason === "refusal";
}

type Reservation = { mode: "ai" } | { mode: "manual"; reason: NeedFailReason } | { mode: "existing"; draft: Draft };

async function reserveDraft(
  deps: NeedDeps,
  uid: string,
  draftId: string,
  masked: { text: string; kinds: ParseNeedResponse["maskedKinds"] },
  now: Date,
): Promise<Reservation> {
  const { firestore, limits } = deps;
  const draftRef = firestore.doc(`needDrafts/${draftId}`);
  const usageRef = userLimitRef(firestore, uid, now);
  const textHash = sha256(masked.text);
  return firestore.runTransaction(async (transaction) => {
    const [existing, usage] = await Promise.all([transaction.get(draftRef), transaction.get(usageRef)]);
    if (existing.exists) {
      const draft = existing.data() as Draft;
      if (draft.uid !== uid || draft.textHash !== textHash) {
        throw appError("already-exists", "Bu taslak kimliği başka bir metin için kullanılmış.");
      }
      if (reusable(draft, now)) return { mode: "existing" as const, draft };
      if (draft.status === "pending" && now.getTime() - draft.updatedAt.toMillis() <= STALE_PENDING_MS) {
        throw appError("failed-precondition", "Bu taslak hâlâ işleniyor. Birkaç saniye sonra tekrar dene.");
      }
    }
    await requireVerifiedProfile(firestore, uid, (ref) => transaction.get(ref));

    const drafts = (usage.get("drafts") as number | undefined) ?? 0;
    const aiParses = (usage.get("aiParses") as number | undefined) ?? 0;
    if (!existing.exists && drafts >= limits.dailyDrafts) {
      throw appError("resource-exhausted", "Bugün çok fazla taslak oluşturdun. Yarın tekrar dene.");
    }
    const reservation: Reservation = aiParses >= limits.dailyAiParses ? { mode: "manual", reason: "quota" } : { mode: "ai" };

    const stamp = Timestamp.fromDate(now);
    transaction.set(draftRef, {
      uid,
      textHash,
      maskedText: masked.text,
      maskedKinds: masked.kinds,
      status: "pending",
      failReason: null,
      parsed: null,
      confidence: null,
      clarifications: [],
      publishable: false,
      publishedNeedId: null,
      model: null,
      attempts: 0,
      createdAt: existing.exists ? existing.get("createdAt") : stamp,
      updatedAt: stamp,
      expiresAt: Timestamp.fromMillis(now.getTime() + NEED_DRAFT_TTL_HOURS * HOUR_MS),
    });
    transaction.set(
      usageRef,
      {
        drafts: FieldValue.increment(existing.exists ? 0 : 1),
        aiParses: FieldValue.increment(reservation.mode === "ai" ? 1 : 0),
        expiresAt: rateLimitExpiry(now),
      },
      { merge: true },
    );
    return reservation;
  });
}

async function extractWithRetry(deps: NeedDeps, text: string, now: Date) {
  const startedAt = Date.now();
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let attempts = 0;
  let uncertainBilling = false;
  let result: NeedExtraction;
  do {
    attempts += 1;
    result = await deps.extractor.extractNeed({ text, now });
    usage.inputTokens += result.usage.inputTokens;
    usage.outputTokens += result.usage.outputTokens;
    if (!result.ok && UNCERTAIN_BILLING.has(result.reason)) uncertainBilling = true;
  } while (
    !result.ok &&
    result.reason === "invalid-output" &&
    attempts < 2 &&
    Date.now() - startedAt < (deps.retryWindowMs ?? RETRY_WINDOW_MS)
  );
  return { result, usage, attempts, uncertainBilling };
}

type ExtractionOutcome = { update: DraftUpdate; settle?: () => Promise<void> };

async function runExtraction(deps: NeedDeps, draftId: string, text: string, now: Date): Promise<ExtractionOutcome> {
  const reservation = await reserveTokens(deps.firestore, now, deps.limits.dailyTokenBudget);
  if (!reservation) {
    return { update: { status: "failed", failReason: "budget", publishable: true, model: null, attempts: 0 } };
  }

  let update: DraftUpdate = { status: "failed", failReason: "ai-error", publishable: true, model: null, attempts: 1 };
  let spent = reservation.reserved;
  try {
    const { result, usage, attempts, uncertainBilling } = await extractWithRetry(deps, text, now);
    if (!uncertainBilling) spent = usage.inputTokens + usage.outputTokens;
    update = { ...update, attempts };
    if (result.ok) {
      try {
        const normalized = normalizeExtraction(result.output, now, text);
        update = { ...update, ...normalized, status: "parsed", failReason: null, model: result.model };
      } catch {
        logger.warn("needs.parse.normalizeFailed", { draftId });
      }
    } else {
      if (result.reason === "refusal") update = { ...update, failReason: "refusal", publishable: false };
      const log = result.reason === "misconfigured" ? logger.error : logger.warn;
      log("needs.parse.aiFailed", { draftId, reason: result.reason, detail: result.detail ?? null, attempts });
    }
    logger.info("needs.parse.ai", {
      draftId,
      status: update.status,
      attempts,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  } catch (error) {
    logger.error("needs.parse.extractorCrashed", { draftId, errorName: error instanceof Error ? error.name : "unknown" });
  }
  return { update, settle: () => settleTokens(reservation, spent) };
}

export async function parseNeed(
  deps: NeedDeps,
  uid: string,
  input: { draftId: string; text: string },
): Promise<ParseNeedResponse> {
  const now = (deps.now ?? (() => new Date()))();
  const cleaned = cleanNeedText(input.text);
  if (cleaned.length < NEED_LIMITS.text.min) throw appError("invalid-argument", "İhtiyacını biraz daha ayrıntılı yaz.");
  if (cleaned.length > NEED_LIMITS.text.max) {
    throw appError("invalid-argument", `İhtiyacın en fazla ${NEED_LIMITS.text.max} karakter olabilir.`);
  }
  const masked = maskPii(cleaned);
  const reservation = await reserveDraft(deps, uid, input.draftId, masked, now);
  if (reservation.mode === "existing") return responseFrom(input.draftId, reservation.draft);

  let outcome: ExtractionOutcome;
  if (reservation.mode === "manual") {
    outcome = { update: { status: "failed", failReason: reservation.reason, publishable: true, model: null, attempts: 0 } };
  } else {
    outcome = await runExtraction(deps, input.draftId, masked.text, now);
    if (outcome.update.failReason === "budget") {
      await userLimitRef(deps.firestore, uid, now).set({ aiParses: FieldValue.increment(-1) }, { merge: true });
    }
  }
  const draftRef = deps.firestore.doc(`needDrafts/${input.draftId}`);
  await draftRef.update({ ...outcome.update, updatedAt: Timestamp.fromDate(now) });
  await outcome.settle?.();
  const saved = (await draftRef.get()).data() as Draft;
  return responseFrom(input.draftId, saved);
}

const canonical = (need: unknown) => JSON.stringify(parsedNeedSchema.parse(need));

function fit(value: string, max: number) {
  return truncateText(maskPii(cleanLine(value)).text, max);
}

function sanitizeEditedNeed(need: ParsedNeed): ParsedNeed {
  const result = parsedNeedSchema.safeParse({
    ...need,
    title: fit(need.title, NEED_LIMITS.title.max),
    tags: need.tags.map((tag) => fit(tag, NEED_LIMITS.tags.itemMax)),
    requiredSkills: need.requiredSkills.map((skill) => fit(skill, NEED_LIMITS.tags.itemMax)),
    locationHint: need.locationHint === null ? null : fit(need.locationHint, NEED_LIMITS.locationHint.max),
    when: { ...need.when, rawText: need.when.rawText === null ? null : fit(need.when.rawText, NEED_LIMITS.whenText.max) },
  });
  if (!result.success) throw appError("invalid-argument", "İlan alanları geçersiz. Lütfen kontrol edip tekrar dene.");
  return result.data;
}

export async function publishNeed(
  deps: Pick<NeedDeps, "firestore" | "limits" | "now">,
  uid: string,
  input: { draftId: string; visibility: Visibility; need: ParsedNeed },
): Promise<{ needId: string }> {
  const now = (deps.now ?? (() => new Date()))();
  const { firestore, limits } = deps;
  const draftRef = firestore.doc(`needDrafts/${input.draftId}`);
  const needRef = firestore.doc(`needs/${input.draftId}`);
  const usageRef = userLimitRef(firestore, uid, now);
  const need = sanitizeEditedNeed(input.need);
  return firestore.runTransaction(async (transaction) => {
    const [draftSnapshot, usage] = await Promise.all([transaction.get(draftRef), transaction.get(usageRef)]);
    const draft = draftSnapshot.data() as Draft | undefined;
    if (!draft || draft.uid !== uid) throw appError("not-found", "Taslak bulunamadı.");
    if (draft.publishedNeedId) return { needId: draft.publishedNeedId };
    if (draft.status === "pending") throw appError("failed-precondition", "Taslak hâlâ işleniyor.");
    if (!draft.publishable) {
      throw appError("failed-precondition", "Bu ilan yayımlanamaz. Metni topluluk kurallarına uygun şekilde yeniden yaz.");
    }
    if (draft.expiresAt.toMillis() <= now.getTime()) {
      throw appError("failed-precondition", "Taslağın süresi doldu. Metne dönüp yeniden devam et.");
    }
    const universityId = await requireVerifiedProfile(firestore, uid, (ref) => transaction.get(ref));
    if (((usage.get("publishes") as number | undefined) ?? 0) >= limits.dailyPublishes) {
      throw appError("resource-exhausted", "Bugün yayımlayabileceğin ilan sınırına ulaştın. Yarın tekrar dene.");
    }
    const stamp = Timestamp.fromDate(now);
    transaction.create(needRef, {
      authorUid: uid,
      universityId,
      visibility: input.visibility,
      rawText: draft.maskedText,
      parsed: need,
      parseStatus: draft.status,
      edited: draft.parsed === null || canonical(need) !== canonical(draft.parsed),
      status: "open",
      matchStatus: "pending",
      matchCount: 0,
      createdAt: stamp,
      updatedAt: stamp,
    });
    transaction.update(draftRef, { publishedNeedId: needRef.id, updatedAt: stamp });
    transaction.set(usageRef, { publishes: FieldValue.increment(1), expiresAt: rateLimitExpiry(now) }, { merge: true });
    return { needId: needRef.id };
  });
}

export async function purgeExpired(
  firestore: Firestore,
  collection: "needDrafts" | "rateLimits" | "counterEvents",
  now: Date,
  batchSize = 300,
  maxBatches = 50,
) {
  let total = 0;
  for (let round = 0; round < maxBatches; round += 1) {
    const due = await firestore.collection(collection).where("expiresAt", "<=", Timestamp.fromDate(now)).limit(batchSize).get();
    if (due.empty) break;
    const batch = firestore.batch();
    for (const document of due.docs) batch.delete(document.ref);
    await batch.commit();
    total += due.size;
    if (due.size < batchSize) break;
  }
  return total;
}
