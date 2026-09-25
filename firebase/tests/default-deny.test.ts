import { assertFails } from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getBytes, ref, uploadString } from "firebase/storage";
import { afterAll, beforeAll, describe, it } from "vitest";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/u1"), { displayName: "Deniz" });
    await uploadString(ref(context.storage(), "verification/u1/belge.pdf"), "%PDF-1.7");
  });
});

afterAll(async () => {
  await env.cleanup();
});

const verifiedModeratorClaims = { verified: true, universityId: "odtu", moderator: true };

describe("Firestore varsayılan olarak her şeyi reddeder", () => {
  it.each(["users/u1", "needs/n1", "config/matching", "rastgele/koleksiyon"])("anonim okuma reddedilir: %s", async (path) => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), path)));
  });

  it("var olan belgeyi sahibi bile okuyamaz (açık kural yok)", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("u1").firestore(), "users/u1")));
  });

  it("oturumlu kullanıcı kendi yolunda bile yazamaz (açık kural yok)", async () => {
    await assertFails(setDoc(doc(env.authenticatedContext("u1").firestore(), "users/u1"), { displayName: "Deniz" }));
  });

  it("moderatör claim'i tek başına açık kural olmadan erişim sağlamaz", async () => {
    const db = env.authenticatedContext("mod", verifiedModeratorClaims).firestore();
    await assertFails(getDoc(doc(db, "moderationLogs/l1")));
  });
});

describe("Storage varsayılan olarak her şeyi reddeder", () => {
  it("anonim yükleme reddedilir", async () => {
    await assertFails(uploadString(ref(env.unauthenticatedContext().storage(), "verification/u1/belge.pdf"), "%PDF-1.7"));
  });

  it("oturumlu kullanıcı açık kural olmadan okuyamaz", async () => {
    await assertFails(getBytes(ref(env.authenticatedContext("u1").storage(), "verification/u1/belge.pdf")));
  });
});
