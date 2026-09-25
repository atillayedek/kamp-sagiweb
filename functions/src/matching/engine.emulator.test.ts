import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { DEFAULT_MATCHING_CONFIG } from "./config";
import { computeMatches } from "./engine";

const app = initializeApp({ projectId: "demo-kampusagi-matching" }, "matching-test");
const firestore = getFirestore(app);
const run = `${Date.now()}`;
const NOW = new Date("2026-09-25T12:00:00Z");
let sequence = 0;

function campus() {
  sequence += 1;
  return `kampus-${run}-${sequence}`;
}

async function student(
  universityId: string,
  name: string,
  overrides: Partial<{ interests: string[]; skills: string[]; department: string; verificationStatus: string }> = {},
) {
  const uid = `${universityId}-${name}`;
  await firestore.doc(`users/${uid}`).set({
    displayName: name,
    universityId,
    department: "Bilgisayar Mühendisliği",
    interests: [],
    skills: [],
    bio: "",
    verificationStatus: "verified",
    reputationScore: null,
    ...overrides,
  });
  return uid;
}

async function need(universityId: string, authorUid: string, overrides: Record<string, unknown> = {}) {
  sequence += 1;
  const id = `ilan-${run}-${sequence}`;
  await firestore.doc(`needs/${id}`).set({
    authorUid,
    universityId,
    visibility: "campus",
    rawText: "Akşam basketbol",
    parsed: {
      title: "Akşam basketbol",
      category: "spor",
      tags: ["basketbol"],
      requiredSkills: [],
      participants: { min: 3, max: 3 },
      when: { kind: "none", startIso: null, endIso: null, rawText: null },
      locationHint: null,
    },
    parseStatus: "parsed",
    edited: false,
    status: "open",
    matchStatus: "pending",
    matchCount: 0,
    createdAt: Timestamp.fromDate(NOW),
    updatedAt: Timestamp.fromDate(NOW),
    ...overrides,
  });
  return id;
}

async function matchIds(needId: string) {
  return (await firestore.collection(`needs/${needId}/matches`).get()).docs.map((document) => document.id).sort();
}

const deps = { firestore, now: () => NOW, config: DEFAULT_MATCHING_CONFIG };

describe("computeMatches", () => {
  it("yalnızca aynı kampüsteki, doğrulanmış, ilgili ve engellenmemiş adayları eşleştirir", async () => {
    const uni = campus();
    const other = campus();
    const author = await student(uni, "yazar");
    const good = await student(uni, "uygun", { interests: ["basketbol"] });
    await student(uni, "ilgisiz", { interests: ["resim"] });
    await student(other, "baskakampus", { interests: ["basketbol"] });
    await student(uni, "dogrulanmamis", { interests: ["basketbol"], verificationStatus: "pending" });
    const blockedByAuthor = await student(uni, "engellenen", { interests: ["basketbol"] });
    const blocker = await student(uni, "engelleyen", { interests: ["basketbol"] });
    await firestore.doc(`blocks/${author}/blocked/${blockedByAuthor}`).set({ createdAt: Timestamp.fromDate(NOW) });
    await firestore.doc(`blocks/${blocker}/blocked/${author}`).set({ createdAt: Timestamp.fromDate(NOW) });
    const needId = await need(uni, author);

    const result = await computeMatches(deps, needId);
    expect(result).toMatchObject({ status: "done", created: 1, total: 1 });
    expect(await matchIds(needId)).toEqual([good]);

    const match = (await firestore.doc(`needs/${needId}/matches/${good}`).get()).data()!;
    expect(match).toMatchObject({
      candidateUid: good,
      needId,
      needAuthorUid: author,
      status: "suggested",
      weightsVersion: DEFAULT_MATCHING_CONFIG.version,
    });
    expect(match.score).toBeGreaterThanOrEqual(DEFAULT_MATCHING_CONFIG.minScore);
    expect(match.reasons).toEqual(["Aynı kampüstesiniz", "Ortak ilgi alanı: basketbol", "Spor alanına ilgi var", "Aynı bölüm"]);

    const notification = (await firestore.doc(`notifications/${good}/items/match_${needId}`).get()).data()!;
    expect(notification).toMatchObject({ type: "need-match", read: false, payload: { needId, title: "Akşam basketbol" } });

    const saved = (await firestore.doc(`needs/${needId}`).get()).data()!;
    expect(saved).toMatchObject({ matchStatus: "done", matchCount: 1 });
  });

  it("tekrar çalıştırmada çift kayıt üretmez ve gizlenen eşleşmeyi korur", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const candidate = await student(uni, "aday", { interests: ["basketbol"] });
    const needId = await need(uni, author);
    await computeMatches(deps, needId);
    await firestore.doc(`needs/${needId}/matches/${candidate}`).update({ status: "dismissed" });
    await firestore.doc(`notifications/${candidate}/items/match_${needId}`).update({ read: true });

    expect((await computeMatches(deps, needId)).status).toBe("skipped");
    await firestore.doc(`needs/${needId}`).update({ matchStatus: "pending" });
    const again = await computeMatches(deps, needId);
    expect(again).toMatchObject({ created: 0, total: 1 });
    expect((await firestore.doc(`needs/${needId}/matches/${candidate}`).get()).get("status")).toBe("dismissed");
    expect((await firestore.doc(`notifications/${candidate}/items/match_${needId}`).get()).get("read")).toBe(true);
  });

  it("kapalı ilanı atlar", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    await student(uni, "aday", { interests: ["basketbol"] });
    const needId = await need(uni, author, { status: "closed" });
    expect((await computeMatches(deps, needId)).status).toBe("skipped");
    expect(await matchIds(needId)).toEqual([]);
  });

  it("en yüksek skorlu adayları sınır kadar seçer, eşitlikte kimliğe göre sıralar", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const best = await student(uni, "a-en-iyi", { interests: ["basketbol", "akşam"], skills: ["python"] });
    const tieA = await student(uni, "b-esit", { interests: ["basketbol"] });
    await student(uni, "c-esit", { interests: ["basketbol"] });
    const needId = await need(uni, author);
    await firestore.doc(`needs/${needId}`).update({ "parsed.tags": ["basketbol", "akşam"], "parsed.requiredSkills": ["python"] });
    await computeMatches({ ...deps, config: { ...DEFAULT_MATCHING_CONFIG, maxMatches: 2, minScore: 0 } }, needId);
    expect(await matchIds(needId)).toEqual([best, tieA].sort());
  });

  it("geçersiz config belgesinde varsayılanlara döner", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const candidate = await student(uni, "aday", { interests: ["basketbol"] });
    const needId = await need(uni, author);
    const configRef = firestore.doc("config/matching");
    const previous = await configRef.get();
    await configRef.set({ minScore: "yüksek" });
    try {
      await computeMatches({ firestore, now: () => NOW }, needId);
    } finally {
      if (previous.exists) await configRef.set(previous.data()!);
      else await configRef.delete();
    }
    expect(await matchIds(needId)).toEqual([candidate]);
  });

  it("eşzamanlı iki çalıştırma hatasız ve tek kayıtla sonuçlanır", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const candidate = await student(uni, "aday", { interests: ["basketbol"] });
    const needId = await need(uni, author);
    const runs = await Promise.all([computeMatches(deps, needId), computeMatches(deps, needId)]);
    expect(runs.some((run) => run.status === "done")).toBe(true);
    expect(runs.every((run) => run.status === "done" || run.status === "skipped")).toBe(true);
    expect(runs.reduce((sum, run) => sum + run.created, 0)).toBe(1);
    expect(await matchIds(needId)).toEqual([candidate]);
    expect((await firestore.doc(`needs/${needId}`).get()).data()).toMatchObject({ matchStatus: "done", matchCount: 1 });
  });

  it("engellenen adaylar ilk kısa listeyi doldursa da alttaki uygun adaylarla tamamlar", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const uids: string[] = [];
    for (let index = 0; index < 12; index += 1) {
      uids.push(await student(uni, `aday-${String(index).padStart(2, "0")}`, { interests: ["basketbol"] }));
    }
    for (const uid of uids.slice(0, 10)) {
      await firestore.doc(`blocks/${uid}/blocked/${author}`).set({ createdAt: Timestamp.fromDate(NOW) });
    }
    const needId = await need(uni, author);
    await computeMatches({ ...deps, config: { ...DEFAULT_MATCHING_CONFIG, maxMatches: 2 } }, needId);
    expect(await matchIds(needId)).toEqual(uids.slice(10).sort());
  });

  it("bozuk alanlı aday belgesi çalıştırmayı düşürmez", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const good = await student(uni, "saglam", { interests: ["basketbol"] });
    await firestore.doc(`users/${uni}-bozuk`).set({
      universityId: uni,
      verificationStatus: "verified",
      interests: ["basketbol"],
      skills: "python",
      department: 42,
    });
    const needId = await need(uni, author);
    const result = await computeMatches(deps, needId);
    expect(result.status).toBe("done");
    expect(await matchIds(needId)).toEqual([`${uni}-bozuk`, good].sort());
  });

  it("geçersiz ilanı başarısız olarak işaretler", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const needId = await need(uni, author);
    await firestore.doc(`needs/${needId}`).update({ "parsed.category": "yonetici" });
    expect((await computeMatches(deps, needId)).status).toBe("invalid");
    expect((await firestore.doc(`needs/${needId}`).get()).get("matchStatus")).toBe("failed");
  });

  it("adayları ilgi ve beceri sorgusuyla seçer; ilgisiz öğrenciler taranmaz", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const bySkill = await student(uni, "beceri", { skills: ["python"] });
    await student(uni, "ilgisiz", { interests: ["resim"] });
    const needId = await need(uni, author);
    await firestore.doc(`needs/${needId}`).update({ "parsed.requiredSkills": ["python"], "parsed.tags": [] });
    const result = await computeMatches(deps, needId);
    expect(result.candidates).toBe(1);
    expect(await matchIds(needId)).toEqual([bySkill]);
  });

  it("300 aday ile makul sürede tamamlanır (performans ölçümü)", async () => {
    const uni = campus();
    const author = await student(uni, "yazar");
    const batch = firestore.batch();
    for (let index = 0; index < 300; index += 1) {
      batch.set(firestore.doc(`users/${uni}-aday-${index}`), {
        displayName: `Aday ${index}`,
        universityId: uni,
        department: index % 5 === 0 ? "Bilgisayar Mühendisliği" : "Fizik",
        interests: index % 3 === 0 ? ["basketbol"] : ["resim"],
        skills: [],
        bio: "",
        verificationStatus: "verified",
        reputationScore: null,
      });
    }
    await batch.commit();
    const needId = await need(uni, author);
    const result = await computeMatches(deps, needId);
    console.info(`matching.performance candidates=${result.candidates} durationMs=${result.durationMs}`);
    expect(result.candidates).toBe(100);
    expect(result.total).toBe(DEFAULT_MATCHING_CONFIG.maxMatches);
    expect(result.durationMs).toBeLessThan(15_000);
  });
});
