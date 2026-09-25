import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";
import { actors } from "./actors";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;
let a: ReturnType<typeof actors>;

const report = () => ({
  reporterUid: "odtuA",
  targetType: "post",
  targetPath: "posts/kampus",
  reason: "spam",
  details: "",
  status: "open",
  createdAt: serverTimestamp(),
});

beforeAll(async () => {
  env = await createTestEnv();
  a = actors(env);
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "config/matching"), { weights: { campus: 30 } });
    await setDoc(doc(db, "dataExports/odtuA/jobs/j1"), { status: "ready" });
    await setDoc(doc(db, "rateLimits/odtuA-parseNeed"), { count: 1 });
    await setDoc(doc(db, "reports/r0"), report());
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("reports", () => {
  it("istemci rapor oluşturamaz (hedef doğrulaması ve anlık görüntü için callable kullanılır)", async () => {
    await assertFails(setDoc(doc(a.odtuA, "reports/r1"), report()));
    await assertFails(setDoc(doc(a.unverified, "reports/r6"), { ...report(), reporterUid: "yeni" }));
  });

  it("raporları yalnızca moderatör okur; kimse istemciden işleyemez", async () => {
    await assertSucceeds(getDoc(doc(a.moderator, "reports/r0")));
    await assertFails(getDoc(doc(a.odtuA, "reports/r0")));
    await assertFails(updateDoc(doc(a.moderator, "reports/r0"), { status: "resolved" }));
  });
});

describe("sunucuya özel koleksiyonlar", () => {
  it("eşleşme ağırlıkları hiçbir istemciye açık değil", async () => {
    await assertFails(getDoc(doc(a.moderator, "config/matching")));
    await assertFails(getDoc(doc(a.odtuA, "config/matching")));
    await assertFails(setDoc(doc(a.moderator, "config/matching"), { weights: { campus: 100 } }));
  });

  it("veri dışa aktarma işini yalnızca sahibi okur", async () => {
    await assertSucceeds(getDoc(doc(a.odtuA, "dataExports/odtuA/jobs/j1")));
    await assertFails(getDoc(doc(a.odtuB, "dataExports/odtuA/jobs/j1")));
    await assertFails(setDoc(doc(a.odtuA, "dataExports/odtuA/jobs/j2"), { status: "ready" }));
  });

  it("hız sınırı sayaçları istemciye kapalı", async () => {
    await assertFails(getDoc(doc(a.odtuA, "rateLimits/odtuA-parseNeed")));
    await assertFails(setDoc(doc(a.odtuA, "rateLimits/odtuA-parseNeed"), { count: 0 }));
  });
});
