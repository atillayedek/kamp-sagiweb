import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { actors } from "./actors";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;
let a: ReturnType<typeof actors>;

const DAY_MS = 24 * 60 * 60 * 1000;
const post = { authorUid: "odtuA", universityId: "odtu", visibility: "campus", text: "Merhaba", likeCount: 0, commentCount: 0 };
const comment = (authorUid: string, authorUniversityId = "odtu") => ({ authorUid, authorUniversityId, text: "Selam", createdAt: serverTimestamp() });
const event = (startsAt: Date) => ({ title: "Turnuva", universityId: "odtu", visibility: "campus", attendeeCount: 0, startsAt });

beforeAll(async () => {
  env = await createTestEnv();
  a = actors(env);
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "posts/kampus"), post);
    await setDoc(doc(db, "posts/kampus/comments/y1"), { authorUid: "odtuB", text: "Selam", createdAt: new Date() });
    await setDoc(doc(db, "blocks/odtuA/blocked/odtuD"), { createdAt: new Date() });
    await setDoc(doc(db, "blocks/ituE/blocked/odtuA"), { createdAt: new Date() });
    await setDoc(doc(db, "posts/itu-genel"), { ...post, authorUid: "ituE", universityId: "itu", visibility: "global" });
    await setDoc(doc(db, "events/gelecek"), event(new Date(Date.now() + 7 * DAY_MS)));
    await setDoc(doc(db, "events/gecmis"), event(new Date(Date.now() - DAY_MS)));
    await setDoc(doc(db, "events/gecmis/attendees/odtuB"), { joinedAt: new Date(Date.now() - 2 * DAY_MS) });
    await setDoc(doc(db, "reports/r1"), { reporterUid: "odtuB", targetPath: "posts/kampus", status: "open", createdAt: new Date() });
    await setDoc(doc(db, "counterEvents/e1"), { expiresAt: new Date() });
    await setDoc(doc(db, "clubNames/k1"), { clubId: "satranc" });
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("engelleme — yorum ve beğeni", () => {
  it("gönderi sahibinin engellediği kullanıcı yorum yapamaz ve beğenemez", async () => {
    await assertFails(setDoc(doc(a.odtuD, "posts/kampus/comments/y2"), comment("odtuD")));
    await assertFails(setDoc(doc(a.odtuD, "posts/kampus/likes/odtuD"), { createdAt: serverTimestamp() }));
  });

  it("kullanıcı engellediği kişinin gönderisine yorum yapamaz ve beğenemez", async () => {
    await assertFails(setDoc(doc(a.odtuA, "posts/itu-genel/comments/y3"), comment("odtuA")));
    await assertFails(setDoc(doc(a.odtuA, "posts/itu-genel/likes/odtuA"), { createdAt: serverTimestamp() }));
  });

  it("engel yoksa yorum ve beğeni serbest", async () => {
    await assertSucceeds(setDoc(doc(a.odtuB, "posts/kampus/comments/y4"), comment("odtuB")));
    await assertSucceeds(setDoc(doc(a.odtuB, "posts/kampus/likes/odtuB"), { createdAt: serverTimestamp() }));
  });
});

describe("sayaçlar ve silme yalnızca sunucuda", () => {
  it("yorum ve beğeni sayacı istemciden değişmez", async () => {
    await assertFails(updateDoc(doc(a.odtuA, "posts/kampus"), { commentCount: 5 }));
    await assertFails(updateDoc(doc(a.odtuB, "posts/kampus"), { likeCount: 1 }));
  });

  it("gönderi ve yorum istemciden silinemez (callable ile silinir)", async () => {
    await assertFails(deleteDoc(doc(a.odtuA, "posts/kampus")));
    await assertFails(deleteDoc(doc(a.odtuB, "posts/kampus/comments/y1")));
    await assertFails(deleteDoc(doc(a.odtuA, "posts/kampus/comments/y1")));
  });

  it("sayaç olay kayıtları ve kulüp adı kilitleri istemciye kapalı", async () => {
    await assertFails(getDoc(doc(a.odtuA, "counterEvents/e1")));
    await assertFails(setDoc(doc(a.odtuA, "counterEvents/e2"), { expiresAt: new Date() }));
    await assertFails(getDoc(doc(a.odtuA, "clubNames/k1")));
    await assertFails(deleteDoc(doc(a.odtuA, "clubNames/k1")));
  });
});

describe("etkinlik katılımı", () => {
  it("başlamamış etkinliğe katılır", async () => {
    await assertSucceeds(setDoc(doc(a.odtuA, "events/gelecek/attendees/odtuA"), { joinedAt: serverTimestamp() }));
  });

  it("başlamış etkinliğe katılamaz ama katılımını geri alabilir", async () => {
    await assertFails(setDoc(doc(a.odtuA, "events/gecmis/attendees/odtuA"), { joinedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(a.odtuB, "events/gecmis/attendees/odtuB")));
  });

  it("katılım sayacı ve etkinlik alanları istemciden değişmez", async () => {
    await assertFails(updateDoc(doc(a.odtuA, "events/gelecek"), { attendeeCount: 100 }));
    await assertFails(updateDoc(doc(a.odtuA, "events/gelecek"), { startsAt: new Date(Date.now() + 30 * DAY_MS) }));
  });
});

describe("rapor kuyruğu", () => {
  it("moderatör açık raporları tarih sırasıyla listeler", async () => {
    await assertSucceeds(getDocs(query(collection(a.moderator, "reports"), where("status", "==", "open"), orderBy("createdAt", "asc"))));
  });

  it("öğrenci rapor kuyruğunu listeleyemez, kendi raporunu da okuyamaz", async () => {
    await assertFails(getDocs(query(collection(a.odtuB, "reports"), where("reporterUid", "==", "odtuB"))));
    await assertFails(getDoc(doc(a.odtuB, "reports/r1")));
  });
});
