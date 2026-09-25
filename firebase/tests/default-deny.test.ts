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
    await setDoc(doc(context.firestore(), "kurali-olmayan/u1"), { ownerUid: "u1" });
    await setDoc(doc(context.firestore(), "needDrafts/taslak-1"), { uid: "u1", maskedText: "metin" });
    await setDoc(doc(context.firestore(), "rateLimits/needs_u1_2026-09-25"), { drafts: 1 });
    await uploadString(ref(context.storage(), "kurali-olmayan/u1/dosya.pdf"), "%PDF-1.7");
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

  it("açık kuralı olmayan koleksiyonda var olan belge okunamaz", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("u1").firestore(), "kurali-olmayan/u1")));
  });

  it("oturumlu kullanıcı açık kuralı olmayan koleksiyona yazamaz", async () => {
    await assertFails(setDoc(doc(env.authenticatedContext("u1").firestore(), "kurali-olmayan/u2"), { a: 1 }));
  });

  it("moderatör claim'i tek başına açık kural olmadan erişim sağlamaz", async () => {
    const db = env.authenticatedContext("mod", verifiedModeratorClaims).firestore();
    await assertFails(getDoc(doc(db, "kurali-olmayan/u1")));
  });
});

describe("Sunucu iç koleksiyonları istemciye kapalıdır", () => {
  const owner = () => env.authenticatedContext("u1", { verified: true, universityId: "odtu" }).firestore();

  it.each(["needDrafts/taslak-1", "rateLimits/needs_u1_2026-09-25", "config/ai"])(
    "sahibi bile okuyamaz: %s",
    async (path) => {
      await assertFails(getDoc(doc(owner(), path)));
    },
  );

  it("taslak ve sayaç yazılamaz", async () => {
    await assertFails(setDoc(doc(owner(), "needDrafts/taslak-2"), { uid: "u1", status: "parsed" }));
    await assertFails(setDoc(doc(owner(), "rateLimits/needs_u1_2026-09-25"), { drafts: 0 }));
  });

  it("moderatör de okuyamaz", async () => {
    const db = env.authenticatedContext("mod", verifiedModeratorClaims).firestore();
    await assertFails(getDoc(doc(db, "needDrafts/taslak-1")));
  });
});

describe("Storage varsayılan olarak her şeyi reddeder", () => {
  it("anonim yükleme reddedilir", async () => {
    await assertFails(uploadString(ref(env.unauthenticatedContext().storage(), "kurali-olmayan/u1/yeni.pdf"), "%PDF-1.7"));
  });

  it("oturumlu kullanıcı açık kural olmadan okuyamaz", async () => {
    await assertFails(getBytes(ref(env.authenticatedContext("u1").storage(), "kurali-olmayan/u1/dosya.pdf")));
  });
});
