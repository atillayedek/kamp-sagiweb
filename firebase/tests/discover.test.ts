import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { actors } from "./actors";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;
let a: ReturnType<typeof actors>;

const base = { authorUid: "odtuA", universityId: "odtu", visibility: "campus", rawText: "Basketbol", status: "open" };

beforeAll(async () => {
  env = await createTestEnv();
  a = actors(env);
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "needs/kampus"), base);
    await setDoc(doc(db, "needs/genel"), { ...base, visibility: "global" });
    await setDoc(doc(db, "needs/kapali"), { ...base, status: "closed" });
    await setDoc(doc(db, "needs/itu"), { ...base, authorUid: "ituC", universityId: "itu" });
    await setDoc(doc(db, "blocks/odtuA/blocked/odtuD"), { createdAt: new Date() });
    await setDoc(doc(db, "needs/kampus/interests/odtuB"), { uid: "odtuB", needId: "kampus", createdAt: new Date() });
  });
});

afterAll(async () => {
  await env.cleanup();
});

const interest = (uid: string, needId: string) => ({ uid, needId, createdAt: serverTimestamp() });

describe("needs — ilan sahibinin kapatması", () => {
  it("ilan sahibi açık ilanı kapatabilir", async () => {
    await assertSucceeds(updateDoc(doc(a.odtuA, "needs/kampus"), { status: "closed", updatedAt: serverTimestamp() }));
  });

  it("kapalı ilan yeniden açılamaz, başka alan değiştirilemez", async () => {
    await assertFails(updateDoc(doc(a.odtuA, "needs/kapali"), { status: "open", updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(a.odtuA, "needs/kampus"), { status: "closed", updatedAt: serverTimestamp(), visibility: "global" }),
    );
    await assertFails(updateDoc(doc(a.odtuA, "needs/kampus"), { status: "closed", updatedAt: new Date(2020, 0, 1) }));
  });

  it("başkası ilanı kapatamaz, silemez, oluşturamaz", async () => {
    await assertFails(updateDoc(doc(a.odtuB, "needs/kampus"), { status: "closed", updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(a.odtuA, "needs/kampus")));
    await assertFails(setDoc(doc(a.odtuA, "needs/yeni"), base));
  });
});

describe("needs/interests — İlgileniyorum", () => {
  it("görebildiği açık ilana kendi adına ilgi bildirir ve geri alır", async () => {
    await assertSucceeds(setDoc(doc(a.ituC, "needs/genel/interests/ituC"), interest("ituC", "genel")));
    await assertSucceeds(deleteDoc(doc(a.ituC, "needs/genel/interests/ituC")));
  });

  it.each([
    ["başkası adına", () => setDoc(doc(a.odtuD, "needs/genel/interests/ituC"), interest("ituC", "genel"))],
    ["kendi ilanına", () => setDoc(doc(a.odtuA, "needs/kampus/interests/odtuA"), interest("odtuA", "kampus"))],
    ["kapalı ilana", () => setDoc(doc(a.odtuB, "needs/kapali/interests/odtuB"), interest("odtuB", "kapali"))],
    ["göremediği kampüs ilanına", () => setDoc(doc(a.ituC, "needs/kampus/interests/ituC"), interest("ituC", "kampus"))],
    ["engellendiği yazarın ilanına", () => setDoc(doc(a.odtuD, "needs/kampus/interests/odtuD"), interest("odtuD", "kampus"))],
    ["fazla alanla", () => setDoc(doc(a.ituC, "needs/genel/interests/ituC"), { ...interest("ituC", "genel"), not: "x" })],
    ["yanlış ilan kimliğiyle", () => setDoc(doc(a.ituC, "needs/genel/interests/ituC"), interest("ituC", "kampus"))],
    ["doğrulanmadan", () => setDoc(doc(a.unverified, "needs/genel/interests/yeni"), interest("yeni", "genel"))],
  ])("reddedilir: %s", async (_label, write) => {
    await assertFails(write());
  });

  it("başkasının ilgisini silemez", async () => {
    await assertFails(deleteDoc(doc(a.odtuD, "needs/kampus/interests/odtuB")));
  });

  it("ilgi listesini yalnızca ilan sahibi okur", async () => {
    await assertSucceeds(getDocs(collection(a.odtuA, "needs/kampus/interests")));
    await assertFails(getDocs(collection(a.odtuD, "needs/kampus/interests")));
    await assertSucceeds(getDoc(doc(a.odtuB, "needs/kampus/interests/odtuB")));
  });

  it("kullanıcı kendi ilgilerini tüm ilanlarda sorgular, başkasınınkini sorgulayamaz", async () => {
    await assertSucceeds(getDocs(query(collectionGroup(a.odtuB, "interests"), where("uid", "==", "odtuB"))));
    await assertFails(getDocs(query(collectionGroup(a.odtuD, "interests"), where("uid", "==", "odtuB"))));
  });
});

describe("savedNeeds — Kaydet", () => {
  const save = (needId: string) => ({ needId, createdAt: serverTimestamp() });

  it("kendi listesine kaydeder, okur ve siler", async () => {
    await assertSucceeds(setDoc(doc(a.odtuB, "savedNeeds/odtuB/items/kampus"), save("kampus")));
    await assertSucceeds(getDocs(collection(a.odtuB, "savedNeeds/odtuB/items")));
    await assertSucceeds(deleteDoc(doc(a.odtuB, "savedNeeds/odtuB/items/kampus")));
  });

  it("başkasının listesine yazamaz ve okuyamaz", async () => {
    await assertFails(setDoc(doc(a.odtuD, "savedNeeds/odtuB/items/kampus"), save("kampus")));
    await assertFails(getDocs(collection(a.odtuD, "savedNeeds/odtuB/items")));
  });

  it("biçim dışı kaydı reddeder", async () => {
    await assertFails(setDoc(doc(a.odtuB, "savedNeeds/odtuB/items/kampus"), save("genel")));
    await assertFails(setDoc(doc(a.odtuB, "savedNeeds/odtuB/items/kampus"), { ...save("kampus"), score: 1 }));
    await assertFails(setDoc(doc(a.unverified, "savedNeeds/yeni/items/kampus"), save("kampus")));
  });
});
