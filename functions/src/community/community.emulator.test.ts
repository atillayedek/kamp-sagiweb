import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import type { VerifiedActor } from "../lib/profile";
import { applyCounterEvent, counterDelta } from "./counters";
import { communityUsageRef, type CommunityLimits } from "./limits";
import { reportContent } from "./reports";
import { createClub, createEvent, deleteComment, deletePost, normalizeClubName } from "./service";

// Tetikleyicisi olmayan ayrı proje: sayaçlar yalnızca bu testlerin çağrılarıyla değişir.
const app = initializeApp({ projectId: "demo-kampusagi-matching" }, "community-test");
const firestore = getFirestore(app);

const run = `${Date.now()}`;
let sequence = 0;
const next = (prefix: string) => {
  sequence += 1;
  return `${prefix}-${run}-${sequence}`;
};

const NOW = new Date("2026-09-25T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;
const LIMITS: CommunityLimits = { dailyClubs: 2, dailyEvents: 2, dailyReports: 2 };
const deps = (limits: Partial<CommunityLimits> = {}, now = NOW) => ({ firestore, limits: { ...LIMITS, ...limits }, now: () => now });

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpsError) return (error.details as { appCode?: string } | undefined)?.appCode;
    throw error;
  }
  return "başarılı";
}

async function student(universityId = "odtu", status = "verified"): Promise<VerifiedActor> {
  const uid = next("ogrenci");
  await firestore.doc(`users/${uid}`).set({ universityId, verificationStatus: status });
  return { uid, universityId };
}

async function post(authorUid: string, overrides: Record<string, unknown> = {}, id = next("gonderi")) {
  await firestore.doc(`posts/${id}`).set({
    authorUid,
    universityId: "odtu",
    visibility: "campus",
    text: "Kütüphane bugün çok kalabalık",
    likeCount: 0,
    commentCount: 0,
    createdAt: Timestamp.fromDate(NOW),
    ...overrides,
  });
  return id;
}

const club = (overrides: Record<string, unknown> = {}) => ({
  clubId: next("kulup"),
  name: `Satranç ${next("ad")}`,
  description: "Her perşembe akşamı oynuyoruz.",
  visibility: "campus" as const,
  ...overrides,
});

const event = (overrides: Record<string, unknown> = {}) => ({
  eventId: next("etkinlik"),
  title: "Satranç turnuvası",
  description: "",
  location: "Merkez kütüphane",
  startsAt: new Date(NOW.getTime() + 48 * HOUR_MS).toISOString(),
  endsAt: null,
  visibility: "campus" as const,
  ...overrides,
});

describe("sayaçlar", () => {
  it("yazım türünden artış/azalış çıkarır", () => {
    expect(counterDelta(false, true)).toBe(1);
    expect(counterDelta(true, false)).toBe(-1);
    expect(counterDelta(true, true)).toBe(0);
  });

  it("aynı olayı bir kez uygular, azaltır ve olmayan üst belgeyi atlar", async () => {
    const id = await post("yazar");
    const input = { eventId: next("olay"), collection: "likes" as const, parentId: id, delta: 1 as const, childCreatedAt: null };
    expect(await applyCounterEvent({ firestore }, input)).toBe("applied");
    expect(await applyCounterEvent({ firestore }, input)).toBe("duplicate");
    expect((await firestore.doc(`posts/${id}`).get()).get("likeCount")).toBe(1);
    expect(await applyCounterEvent({ firestore }, { ...input, eventId: next("olay"), delta: -1 })).toBe("applied");
    expect((await firestore.doc(`posts/${id}`).get()).get("likeCount")).toBe(0);
    expect(await applyCounterEvent({ firestore }, { ...input, eventId: next("olay"), delta: 0 })).toBe("ignored");
    expect(await applyCounterEvent({ firestore }, { ...input, eventId: next("olay"), parentId: "olmayan" })).toBe("orphan");
  });

  it("aynı kimlikle yeniden oluşturulan üst belgeye eski alt belgenin olayını uygulamaz", async () => {
    const id = await post("yazar");
    const parentCreatedAt = (await firestore.doc(`posts/${id}`).get()).createTime!.toMillis();
    const input = { eventId: next("olay"), collection: "likes" as const, parentId: id, delta: -1 as const };
    expect(await applyCounterEvent({ firestore }, { ...input, childCreatedAt: parentCreatedAt - 1000 })).toBe("stale");
    expect((await firestore.doc(`posts/${id}`).get()).get("likeCount")).toBe(0);
  });
});

describe("createClub", () => {
  it("kulübü, ad kilidini ve kurucu üyeliğini oluşturur; aynı istek tekrarlanınca aynı sonucu verir", async () => {
    const actor = await student();
    const input = club();
    expect(await createClub(deps(), actor, input)).toEqual({ clubId: input.clubId });
    expect(await createClub(deps(), actor, input)).toEqual({ clubId: input.clubId });
    const saved = (await firestore.doc(`clubs/${input.clubId}`).get()).data();
    expect(saved).toMatchObject({ name: input.name, universityId: "odtu", founderUid: actor.uid, memberCount: 0, visibility: "campus" });
    expect((await firestore.doc(`clubs/${input.clubId}/members/${actor.uid}`).get()).exists).toBe(true);
    expect((await communityUsageRef(firestore, actor.uid, NOW).get()).get("clubs")).toBe(1);
  });

  it("aynı kimlikle farklı içerik veya başkasının kimliği reddedilir", async () => {
    const actor = await student();
    const input = club();
    await createClub(deps(), actor, input);
    expect(await codeOf(createClub(deps(), actor, { ...input, description: "Başka bir tanıtım metni." }))).toBe("already-exists");
    expect(await codeOf(createClub(deps(), await student(), { ...input, name: `Başka ${run}` }))).toBe("already-exists");
  });

  it("aynı üniversitede yalnızca büyük/küçük harf ve ayraç farkı olan adı engeller", async () => {
    const name = `Münazara ${run}`;
    await createClub(deps(), await student(), club({ name }));
    expect(normalizeClubName(`  MÜNAZARA   ${run}!`)).toBe(normalizeClubName(name));
    expect(await codeOf(createClub(deps(), await student(), club({ name: `  MÜNAZARA   ${run}!` })))).toBe("already-exists");
    expect(await codeOf(createClub(deps(), await student("itu"), club({ name })))).toBe("başarılı");
    expect(normalizeClubName("C++ Topluluğu")).not.toBe(normalizeClubName("C# Topluluğu"));
  });

  it("doğrulanmamış kullanıcıyı, claim'i profille uyuşmayanı ve günlük sınırı aşanı reddeder", async () => {
    expect(await codeOf(createClub(deps(), await student("odtu", "pending"), club()))).toBe("not-verified");
    const stale = await student("odtu");
    expect(await codeOf(createClub(deps(), { ...stale, universityId: "itu" }, club()))).toBe("not-verified");
    const actor = await student();
    await createClub(deps({ dailyClubs: 1 }), actor, club());
    expect(await codeOf(createClub(deps({ dailyClubs: 1 }), actor, club()))).toBe("resource-exhausted");
  });
});

describe("createEvent", () => {
  it("etkinliği zaman damgalarıyla oluşturur ve düzenleyeni katılımcı yapar", async () => {
    const actor = await student();
    const input = event({ endsAt: new Date(NOW.getTime() + 50 * HOUR_MS).toISOString(), visibility: "global" });
    expect(await createEvent(deps(), actor, input)).toEqual({ eventId: input.eventId });
    const saved = await firestore.doc(`events/${input.eventId}`).get();
    expect((saved.get("startsAt") as Timestamp).toMillis()).toBe(Date.parse(input.startsAt));
    expect((saved.get("endsAt") as Timestamp).toMillis()).toBe(Date.parse(input.endsAt!));
    expect(saved.data()).toMatchObject({ organizerUid: actor.uid, universityId: "odtu", visibility: "global", attendeeCount: 0 });
    expect((await firestore.doc(`events/${input.eventId}/attendees/${actor.uid}`).get()).exists).toBe(true);
  });

  it("yanıtı kaybolan isteğin tekrarı, zaman sınırı geçmiş olsa da aynı etkinliği döner; farklı içerik reddedilir", async () => {
    const actor = await student();
    const input = event({ startsAt: new Date(NOW.getTime() + 16 * 60 * 1000).toISOString() });
    await createEvent(deps(), actor, input);
    const later = new Date(NOW.getTime() + 2 * 60 * 1000);
    expect(await createEvent(deps({}, later), actor, input)).toEqual({ eventId: input.eventId });
    expect(await codeOf(createEvent(deps({}, later), actor, { ...input, title: "Başka başlık" }))).toBe("already-exists");
  });

  it("çok yakın, geçmiş veya çok uzak tarihi reddeder", async () => {
    const actor = await student();
    const at = (ms: number) => event({ startsAt: new Date(NOW.getTime() + ms).toISOString() });
    expect(await codeOf(createEvent(deps(), actor, at(5 * 60 * 1000)))).toBe("invalid-argument");
    expect(await codeOf(createEvent(deps(), actor, at(-HOUR_MS)))).toBe("invalid-argument");
    expect(await codeOf(createEvent(deps(), actor, at(181 * 24 * HOUR_MS)))).toBe("invalid-argument");
  });

  it("günlük sınırı uygular", async () => {
    const actor = await student();
    await createEvent(deps({ dailyEvents: 1 }), actor, event());
    expect(await codeOf(createEvent(deps({ dailyEvents: 1 }), actor, event()))).toBe("resource-exhausted");
  });
});

describe("deletePost ve deleteComment", () => {
  it("yazar gönderiyi yorum ve beğenileriyle siler; başkası için sonuç “missing” olur ve belge kalır", async () => {
    const author = await student();
    const id = await post(author.uid);
    await firestore.doc(`posts/${id}/comments/c1`).set({ authorUid: "baska", text: "Selam" });
    await firestore.doc(`posts/${id}/likes/baska`).set({ createdAt: Timestamp.fromDate(NOW) });
    expect(await deletePost({ firestore }, "baska", { postId: id })).toEqual({ status: "missing" });
    expect((await firestore.doc(`posts/${id}`).get()).exists).toBe(true);
    expect(await deletePost({ firestore }, author.uid, { postId: id })).toEqual({ status: "deleted" });
    expect((await firestore.doc(`posts/${id}`).get()).exists).toBe(false);
    expect((await firestore.collection(`posts/${id}/comments`).get()).size).toBe(0);
    expect((await firestore.collection(`posts/${id}/likes`).get()).size).toBe(0);
    expect(await deletePost({ firestore }, author.uid, { postId: id })).toEqual({ status: "missing" });
  });

  it("yorumu yazarı veya gönderi sahibi siler; üçüncü kişi için sonuç “missing” olur", async () => {
    const id = await post("sahip");
    await firestore.doc(`posts/${id}/comments/c1`).set({ authorUid: "yorumcu", text: "Bir" });
    await firestore.doc(`posts/${id}/comments/c2`).set({ authorUid: "yorumcu", text: "İki" });
    expect(await deleteComment({ firestore }, "ucuncu", { postId: id, commentId: "c1" })).toEqual({ status: "missing" });
    expect((await firestore.doc(`posts/${id}/comments/c1`).get()).exists).toBe(true);
    expect(await deleteComment({ firestore }, "yorumcu", { postId: id, commentId: "c1" })).toEqual({ status: "deleted" });
    expect(await deleteComment({ firestore }, "sahip", { postId: id, commentId: "c2" })).toEqual({ status: "deleted" });
    expect(await deleteComment({ firestore }, "sahip", { postId: id, commentId: "c2" })).toEqual({ status: "missing" });
  });
});

describe("reportContent", () => {
  const report = (target: Parameters<typeof reportContent>[2]["target"], details = "") => ({ target, reason: "spam" as const, details });
  const reportDeps = (dailyReports = 5) => ({ firestore, dailyReports, now: () => NOW });

  it("anlık görüntüyle rapor oluşturur, tekrarını kota harcamadan “duplicate” döner", async () => {
    const reporter = await student();
    const id = await post("yazar");
    const first = await reportContent(reportDeps(), reporter, report({ type: "post", postId: id }, "Numarası 0532 123 45 67"));
    expect(first.status).toBe("created");
    const saved = (await firestore.doc(`reports/${first.reportId}`).get()).data()!;
    expect(saved).toMatchObject({
      reporterUid: reporter.uid,
      reporterUniversityId: "odtu",
      targetType: "post",
      targetPath: `posts/${id}`,
      targetOwnerUid: "yazar",
      targetUniversityId: "odtu",
      reason: "spam",
      status: "open",
      snapshot: { title: null, text: "Kütüphane bugün çok kalabalık", visibility: "campus" },
    });
    expect(saved.details).not.toContain("123 45 67");
    expect(await reportContent(reportDeps(), reporter, report({ type: "post", postId: id }))).toEqual({
      reportId: first.reportId,
      status: "duplicate",
    });
    expect((await communityUsageRef(firestore, reporter.uid, NOW).get()).get("reports")).toBe(1);
  });

  it("aynı kimlikle yeniden oluşturulan içerik yeniden bildirilebilir", async () => {
    const reporter = await student();
    const id = await post("yazar");
    const first = await reportContent(reportDeps(), reporter, report({ type: "post", postId: id }));
    await firestore.doc(`posts/${id}`).delete();
    await post("yazar", { text: "Yeni içerik" }, id);
    const second = await reportContent(reportDeps(), reporter, report({ type: "post", postId: id }));
    expect(second.status).toBe("created");
    expect(second.reportId).not.toBe(first.reportId);
  });

  it("yorumun görünürlüğünü gönderisinden, üniversitesini yorumcudan alır", async () => {
    const id = await post("yazar", { universityId: "itu", visibility: "global" });
    await firestore.doc(`posts/${id}/comments/c1`).set({
      authorUid: "yorumcu",
      authorUniversityId: "odtu",
      text: "Kaba yorum",
      createdAt: Timestamp.fromDate(NOW),
    });
    const result = await reportContent(reportDeps(), await student("boun"), report({ type: "comment", postId: id, commentId: "c1" }));
    const saved = (await firestore.doc(`reports/${result.reportId}`).get()).data()!;
    expect(saved).toMatchObject({ targetOwnerUid: "yorumcu", targetUniversityId: "odtu", snapshot: { text: "Kaba yorum", visibility: "global" } });
  });

  it("göremediği, olmayan veya kendi içeriğini bildiremez; görünürlük claim'e göre belirlenir", async () => {
    const reporter = await student("itu");
    const hidden = await post("yazar");
    expect(await codeOf(reportContent(reportDeps(), reporter, report({ type: "post", postId: hidden })))).toBe("not-found");
    expect(await codeOf(reportContent(reportDeps(), reporter, report({ type: "post", postId: "olmayan" })))).toBe("not-found");
    const own = await post(reporter.uid, { universityId: "itu" });
    expect(await codeOf(reportContent(reportDeps(), reporter, report({ type: "post", postId: own })))).toBe("invalid-argument");
    expect(await codeOf(reportContent(reportDeps(), await student("odtu", "pending"), report({ type: "post", postId: hidden })))).toBe(
      "not-verified",
    );
    expect(await codeOf(reportContent(reportDeps(), { ...reporter, universityId: "odtu" }, report({ type: "post", postId: hidden })))).toBe(
      "not-verified",
    );
  });

  it("ilan, kulüp ve etkinlik için başlık ve metin alır", async () => {
    const reporter = await student();
    const needId = next("ilan");
    await firestore.doc(`needs/${needId}`).set({
      authorUid: "yazar",
      universityId: "odtu",
      visibility: "campus",
      rawText: "Ham metin",
      parsed: { title: "Basketbol" },
    });
    const clubInput = club();
    await createClub(deps(), await student(), clubInput);
    const eventInput = event({ description: "Tahta getir" });
    await createEvent(deps(), await student(), eventInput);
    const snapshots = await Promise.all(
      [
        { type: "need" as const, needId },
        { type: "club" as const, clubId: clubInput.clubId },
        { type: "event" as const, eventId: eventInput.eventId },
      ].map(async (target) => {
        const { reportId } = await reportContent(reportDeps(), reporter, report(target));
        return (await firestore.doc(`reports/${reportId}`).get()).get("snapshot");
      }),
    );
    expect(snapshots[0]).toMatchObject({ title: "Basketbol", text: "Ham metin" });
    expect(snapshots[1]).toMatchObject({ title: clubInput.name, text: clubInput.description });
    expect(snapshots[2]).toMatchObject({ title: "Satranç turnuvası", text: "Yer: Merkez kütüphane\nTahta getir" });
  });

  it("günlük bildirim sınırını uygular", async () => {
    const reporter = await student();
    await reportContent(reportDeps(1), reporter, report({ type: "post", postId: await post("yazar") }));
    expect(await codeOf(reportContent(reportDeps(1), reporter, report({ type: "post", postId: await post("yazar") })))).toBe(
      "resource-exhausted",
    );
  });
});
