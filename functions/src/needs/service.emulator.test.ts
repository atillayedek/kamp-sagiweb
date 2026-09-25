import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiNeedOutput } from "../ai/need-output";
import type { NeedExtraction, NeedExtractor } from "../ai/types";
import { zonedDayKey } from "@kampusagi/contracts";
import { tokenShardRefs, TOKENS_RESERVED_PER_PARSE } from "./budget";
import { parseNeed, publishNeed, purgeExpired, type NeedDeps, type NeedLimits } from "./service";

const app = initializeApp({ projectId: "demo-kampusagi" }, "needs-test");
const firestore = getFirestore(app);

const NOW = new Date("2026-09-25T11:30:00Z");
const run = `${Date.now()}`;
let sequence = 0;

const LIMITS: NeedLimits = { dailyAiParses: 3, dailyDrafts: 5, dailyPublishes: 2, dailyTokenBudget: 1_000_000 };

const output: AiNeedOutput = {
  title: "Yarın akşam basketbol",
  category: "spor",
  tags: ["basketbol"],
  requiredSkills: [],
  participants: { min: 3, max: 3 },
  when: { kind: "exact", startIso: "2026-09-26T18:00:00+03:00", endIso: null, rawText: "yarın 18:00" },
  locationHint: "Spor salonu",
  confidence: 0.9,
  needsClarification: [],
};

const success: NeedExtraction = { ok: true, output, usage: { inputTokens: 400, outputTokens: 100 }, model: "claude-opus-5" };

function extractorWith(...results: NeedExtraction[]) {
  const extractNeed = vi.fn(async () => results.shift() ?? success);
  return { extractNeed } satisfies NeedExtractor;
}

function deps(extractor: NeedExtractor, limits: Partial<NeedLimits> = {}, now = NOW): NeedDeps {
  return { firestore, extractor, limits: { ...LIMITS, ...limits }, now: () => now };
}

const DAY_MS = 24 * 60 * 60 * 1000;
let dayOffset = 0;

function uniqueDay() {
  dayOffset += 1;
  return new Date(Date.UTC(2030, 0, 1, 9) + ((Number(run) % 10_000) * 50 + dayOffset) * DAY_MS);
}

async function spentTokens(now: Date) {
  const shards = await Promise.all(tokenShardRefs(firestore, now).map((ref) => ref.get()));
  return shards.reduce((sum, shard) => sum + ((shard.get("tokens") as number | undefined) ?? 0), 0);
}

async function student(status = "verified") {
  sequence += 1;
  const uid = `ogrenci-${run}-${sequence}`;
  await firestore.doc(`users/${uid}`).set({ universityId: "odtu", verificationStatus: status });
  return uid;
}

const draftId = () => {
  sequence += 1;
  return `taslak-${run}-${sequence}`;
};

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpsError) return (error.details as { appCode?: string } | undefined)?.appCode;
    throw error;
  }
  return "başarılı";
}

const TEXT = "Yarın 18:00'de spor salonunda basket oynayacak 3 kişi arıyorum. Numaram 0532 123 45 67";

let uid: string;

beforeEach(async () => {
  uid = await student();
});

describe("parseNeed", () => {
  it("metni maskeleyip Claude'a gönderir ve yapılandırılmış taslak döndürür", async () => {
    const extractor = extractorWith(success);
    const id = draftId();
    const result = await parseNeed(deps(extractor), uid, { draftId: id, text: TEXT });
    expect(extractor.extractNeed).toHaveBeenCalledTimes(1);
    const sent = (extractor.extractNeed.mock.calls[0] as unknown as [{ text: string }])[0].text;
    expect(sent).not.toContain("0532");
    expect(sent).toContain("[telefon]");
    expect(result).toMatchObject({
      draftId: id,
      status: "parsed",
      failReason: null,
      confidence: 0.9,
      maskedKinds: ["phone"],
      publishable: true,
    });
    expect(result.maskedText).toContain("[telefon]");
    expect(result.parsed.title).toBe("Yarın akşam basketbol");
    const draft = await firestore.doc(`needDrafts/${id}`).get();
    expect(draft.get("uid")).toBe(uid);
    expect(draft.get("model")).toBe("claude-opus-5");
    expect(JSON.stringify(draft.data())).not.toContain("0532");
  });

  it("aynı taslak için Claude'u yeniden çağırmaz (idempotent)", async () => {
    const extractor = extractorWith(success);
    const id = draftId();
    const first = await parseNeed(deps(extractor), uid, { draftId: id, text: TEXT });
    const second = await parseNeed(deps(extractor), uid, { draftId: id, text: TEXT });
    expect(second).toEqual(first);
    expect(extractor.extractNeed).toHaveBeenCalledTimes(1);
  });

  it("taslak kimliği başka metin veya başka kullanıcı için kullanılamaz", async () => {
    const id = draftId();
    await parseNeed(deps(extractorWith(success)), uid, { draftId: id, text: TEXT });
    expect(await codeOf(parseNeed(deps(extractorWith()), uid, { draftId: id, text: `${TEXT} farklı` }))).toBe("already-exists");
    const other = await student();
    expect(await codeOf(parseNeed(deps(extractorWith()), other, { draftId: id, text: TEXT }))).toBe("already-exists");
  });

  it("geçersiz çıktıda bir kez yeniden dener", async () => {
    const extractor = extractorWith({ ok: false, reason: "invalid-output", usage: { inputTokens: 300, outputTokens: 50 } }, success);
    const result = await parseNeed(deps(extractor), uid, { draftId: draftId(), text: TEXT });
    expect(extractor.extractNeed).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("parsed");
  });

  it("ikinci denemede de başarısızsa elle doldurma taslağına düşer", async () => {
    const failure: NeedExtraction = { ok: false, reason: "invalid-output", usage: { inputTokens: 300, outputTokens: 40 } };
    const extractor = extractorWith(failure, failure);
    const result = await parseNeed(deps(extractor), uid, { draftId: draftId(), text: TEXT });
    expect(extractor.extractNeed).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: "failed", failReason: "ai-error", publishable: true, confidence: null });
    expect(result.parsed).toMatchObject({ category: "diger", participants: { min: 1, max: 1 } });
    expect(result.parsed.title).toContain("Yarın 18:00");
  });

  it.each(["timeout", "unavailable", "truncated", "rate-limited"] as const)(
    "%s durumunda uygulama katmanında yeniden denemez",
    async (reason) => {
      const extractor = extractorWith({ ok: false, reason, usage: { inputTokens: 0, outputTokens: 0 } });
      const result = await parseNeed(deps(extractor, {}, uniqueDay()), uid, { draftId: draftId(), text: TEXT });
      expect(extractor.extractNeed).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ status: "failed", failReason: "ai-error" });
    },
  );

  it("reddi yeniden denemez ve yayımlanamaz olarak işaretler", async () => {
    const extractor = extractorWith({ ok: false, reason: "refusal", usage: { inputTokens: 100, outputTokens: 0 } });
    const result = await parseNeed(deps(extractor), uid, { draftId: draftId(), text: TEXT });
    expect(extractor.extractNeed).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: "failed", failReason: "refusal", publishable: false });
  });

  it("beklenmeyen bir connector hatasında taslağı elle doldurmaya düşürür", async () => {
    const extractor = { extractNeed: vi.fn(async () => Promise.reject(new TypeError("bug"))) };
    const result = await parseNeed(deps(extractor), uid, { draftId: draftId(), text: TEXT });
    expect(result).toMatchObject({ status: "failed", failReason: "ai-error", publishable: true });
  });

  it("günlük kullanıcı kotası dolunca Claude'u çağırmadan elle doldurmaya düşer", async () => {
    const extractor = extractorWith();
    const limits = { dailyAiParses: 1 };
    await parseNeed(deps(extractor, limits), uid, { draftId: draftId(), text: TEXT });
    const result = await parseNeed(deps(extractor, limits), uid, { draftId: draftId(), text: `${TEXT} tekrar` });
    expect(extractor.extractNeed).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: "failed", failReason: "quota", publishable: true });
  });

  it("günlük taslak sınırı aşılınca reddeder", async () => {
    const limits = { dailyDrafts: 2 };
    await parseNeed(deps(extractorWith(), limits), uid, { draftId: draftId(), text: `${TEXT} 1` });
    await parseNeed(deps(extractorWith(), limits), uid, { draftId: draftId(), text: `${TEXT} 2` });
    expect(await codeOf(parseNeed(deps(extractorWith(), limits), uid, { draftId: draftId(), text: `${TEXT} 3` }))).toBe(
      "resource-exhausted",
    );
  });

  it("günlük token bütçesi dolunca Claude'u çağırmaz ve kullanıcı hakkını iade eder", async () => {
    const extractor = extractorWith();
    const now = uniqueDay();
    await Promise.all(tokenShardRefs(firestore, now).map((ref) => ref.set({ tokens: 10_000_000 })));
    const result = await parseNeed(deps(extractor, {}, now), uid, { draftId: draftId(), text: TEXT });
    expect(extractor.extractNeed).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "failed", failReason: "budget", publishable: true });
    const usage = await firestore.doc(`rateLimits/needs_${uid}_${zonedDayKey(now)}`).get();
    expect(usage.get("aiParses")).toBe(0);
  });

  it("gerçek token kullanımını bütçeye yazar, ayrılan fazlayı iade eder", async () => {
    const now = uniqueDay();
    await parseNeed(deps(extractorWith(success), {}, now), uid, { draftId: draftId(), text: TEXT });
    expect(await spentTokens(now)).toBe(500);
  });

  it("zaman aşımında faturası belirsiz kullanımı ayrılan miktar olarak sayar", async () => {
    const now = uniqueDay();
    const extractor = extractorWith({ ok: false, reason: "timeout", usage: { inputTokens: 0, outputTokens: 0 } });
    await parseNeed(deps(extractor, {}, now), uid, { draftId: draftId(), text: TEXT });
    expect(await spentTokens(now)).toBe(TOKENS_RESERVED_PER_PARSE);
  });

  it("aynı taslak yeniden gönderildiğinde başarısız veya süresi dolmuş taslağı yeniden işler", async () => {
    const id = draftId();
    const failure: NeedExtraction = { ok: false, reason: "unavailable", usage: { inputTokens: 0, outputTokens: 0 } };
    const first = await parseNeed(deps(extractorWith(failure)), uid, { draftId: id, text: TEXT });
    expect(first.failReason).toBe("ai-error");
    const retry = extractorWith(success);
    const second = await parseNeed(deps(retry), uid, { draftId: id, text: TEXT });
    expect(retry.extractNeed).toHaveBeenCalledTimes(1);
    expect(second.status).toBe("parsed");

    await firestore.doc(`needDrafts/${id}`).update({ expiresAt: Timestamp.fromDate(new Date(NOW.getTime() - 1000)) });
    const again = extractorWith(success);
    await parseNeed(deps(again), uid, { draftId: id, text: TEXT });
    expect(again.extractNeed).toHaveBeenCalledTimes(1);
    const usage = await firestore.doc(`rateLimits/needs_${uid}_2026-09-25`).get();
    expect(usage.get("drafts")).toBe(1);
  });

  it("reddedilen taslağı aynı kimlikle yeniden Claude'a göndermez", async () => {
    const id = draftId();
    const refusal: NeedExtraction = { ok: false, reason: "refusal", usage: { inputTokens: 0, outputTokens: 0 } };
    await parseNeed(deps(extractorWith(refusal)), uid, { draftId: id, text: TEXT });
    const extractor = extractorWith(success);
    const result = await parseNeed(deps(extractor), uid, { draftId: id, text: TEXT });
    expect(extractor.extractNeed).not.toHaveBeenCalled();
    expect(result.failReason).toBe("refusal");
  });

  it("işlenmekte olan taslak için tekrar isteği reddeder, zaman aşımı sonrası devralır", async () => {
    const id = draftId();
    await parseNeed(deps(extractorWith(success)), uid, { draftId: id, text: TEXT });
    const ref = firestore.doc(`needDrafts/${id}`);
    await ref.update({ status: "pending", updatedAt: Timestamp.fromDate(NOW) });
    expect(await codeOf(parseNeed(deps(extractorWith()), uid, { draftId: id, text: TEXT }))).toBe("failed-precondition");
    await ref.update({ updatedAt: Timestamp.fromDate(new Date(NOW.getTime() - 10 * 60 * 1000)) });
    const result = await parseNeed(deps(extractorWith(success)), uid, { draftId: id, text: TEXT });
    expect(result.status).toBe("parsed");
  });

  it("normalizasyonla uzayan metni reddeder", async () => {
    const expanding = String.fromCharCode(0xfdfa).repeat(100);
    expect(await codeOf(parseNeed(deps(extractorWith()), uid, { draftId: draftId(), text: expanding }))).toBe(
      "invalid-argument",
    );
  });

  it("doğrulanmamış profili reddeder", async () => {
    const pending = await student("pending");
    expect(await codeOf(parseNeed(deps(extractorWith()), pending, { draftId: draftId(), text: TEXT }))).toBe("not-verified");
  });

  it("temizlik sonrası çok kısa kalan metni reddeder", async () => {
    expect(
      await codeOf(parseNeed(deps(extractorWith()), uid, { draftId: draftId(), text: "\u200b\u200b\u200b\u200b\u200b\u200bkısa   " })),
    ).toBe("invalid-argument");
  });
});

describe("publishNeed", () => {
  async function parsedDraft(...extractions: NeedExtraction[]) {
    const id = draftId();
    const result = await parseNeed(deps(extractorWith(...extractions)), uid, { draftId: id, text: TEXT });
    return { id, result };
  }

  it("ilanı sunucu alanlarıyla oluşturur", async () => {
    const { id, result } = await parsedDraft();
    const { needId } = await publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "campus", need: result.parsed });
    expect(needId).toBe(id);
    const need = (await firestore.doc(`needs/${needId}`).get()).data()!;
    expect(need).toMatchObject({
      authorUid: uid,
      universityId: "odtu",
      visibility: "campus",
      rawText: result.maskedText,
      parseStatus: "parsed",
      edited: false,
      status: "open",
    });
    expect(need.parsed).toEqual(result.parsed);
    expect(need.rawText).not.toContain("0532");
  });

  it("kullanıcı düzenlemesini işaretler ve düzenlenen alanlardaki kişisel bilgiyi gizler", async () => {
    const { id, result } = await parsedDraft();
    const edited = { ...result.parsed, title: "Basket, ara: 0532 123 45 67", locationHint: "ali@ornek.com" };
    await publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "global", need: edited });
    const need = (await firestore.doc(`needs/${id}`).get()).data()!;
    expect(need.edited).toBe(true);
    expect(need.parsed.title).toBe("Basket, ara: [telefon]");
    expect(need.parsed.locationHint).toBe("[e-posta]");
    expect(need.visibility).toBe("global");
  });

  it("tekrar yayımlamada aynı ilanı döndürür", async () => {
    const { id, result } = await parsedDraft();
    const first = await publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "campus", need: result.parsed });
    const second = await publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "campus", need: result.parsed });
    expect(second).toEqual(first);
  });

  it("başkasının taslağını yayımlamaz", async () => {
    const { id, result } = await parsedDraft();
    const other = await student();
    expect(await codeOf(publishNeed(deps(extractorWith()), other, { draftId: id, visibility: "campus", need: result.parsed }))).toBe(
      "not-found",
    );
  });

  it("reddedilen taslağı yayımlamaz", async () => {
    const { id, result } = await parsedDraft({ ok: false, reason: "refusal", usage: { inputTokens: 0, outputTokens: 0 } });
    expect(await codeOf(publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "campus", need: result.parsed }))).toBe(
      "failed-precondition",
    );
  });

  it("elle doldurulan taslağı yayımlar", async () => {
    const failure: NeedExtraction = { ok: false, reason: "unavailable", usage: { inputTokens: 0, outputTokens: 0 } };
    const { id, result } = await parsedDraft(failure, failure);
    await publishNeed(deps(extractorWith()), uid, {
      draftId: id,
      visibility: "campus",
      need: { ...result.parsed, title: "Basket için 3 kişi", category: "spor" },
    });
    const need = (await firestore.doc(`needs/${id}`).get()).data()!;
    expect(need).toMatchObject({ parseStatus: "failed", edited: true });
  });

  it("süresi dolan taslağı yayımlamaz", async () => {
    const { id, result } = await parsedDraft();
    await firestore.doc(`needDrafts/${id}`).update({ expiresAt: Timestamp.fromDate(new Date(NOW.getTime() - 1000)) });
    expect(await codeOf(publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "campus", need: result.parsed }))).toBe(
      "failed-precondition",
    );
  });

  it("doğrulaması geri alınan kullanıcıyı reddeder", async () => {
    const { id, result } = await parsedDraft();
    await firestore.doc(`users/${uid}`).update({ verificationStatus: "rejected" });
    expect(await codeOf(publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "campus", need: result.parsed }))).toBe(
      "not-verified",
    );
  });

  it("maskeleme alanı uzatırsa sınıra göre kısaltır", async () => {
    const { id, result } = await parsedDraft();
    const title = `${"a".repeat(68)} 10000000146`;
    await publishNeed(deps(extractorWith()), uid, { draftId: id, visibility: "campus", need: { ...result.parsed, title } });
    const need = (await firestore.doc(`needs/${id}`).get()).data()!;
    expect(need.parsed.title.length).toBeLessThanOrEqual(80);
    expect(need.parsed.title).not.toContain("10000000146");
  });

  it("günlük yayın sınırını uygular", async () => {
    const limits = { dailyPublishes: 1 };
    const a = await parsedDraft();
    await publishNeed(deps(extractorWith(), limits), uid, { draftId: a.id, visibility: "campus", need: a.result.parsed });
    const b = await parsedDraft();
    expect(
      await codeOf(publishNeed(deps(extractorWith(), limits), uid, { draftId: b.id, visibility: "campus", need: b.result.parsed })),
    ).toBe("resource-exhausted");
  });
});

describe("purgeExpired", () => {
  it("süresi dolan taslakları ve sayaçları siler", async () => {
    const expired = firestore.doc(`needDrafts/eski-${run}`);
    const fresh = firestore.doc(`needDrafts/yeni-${run}`);
    await expired.set({ expiresAt: Timestamp.fromDate(new Date(NOW.getTime() - 1000)) });
    await fresh.set({ expiresAt: Timestamp.fromDate(new Date(NOW.getTime() + 60_000)) });
    await purgeExpired(firestore, "needDrafts", NOW);
    expect((await expired.get()).exists).toBe(false);
    expect((await fresh.get()).exists).toBe(true);
  });
});
