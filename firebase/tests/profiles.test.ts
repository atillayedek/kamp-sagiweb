import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;

const odtuVerified = { verified: true, universityId: "odtu" };
const ituVerified = { verified: true, universityId: "itu" };

const profile = (universityId: string) => ({
  displayName: "Deniz",
  universityId,
  department: "Bilgisayar Mühendisliği",
  interests: [],
  skills: [],
  bio: "",
  verificationStatus: "verified",
  reputationScore: null,
});

beforeAll(async () => {
  env = await createTestEnv();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "universities/odtu"), { name: "Orta Doğu Teknik Üniversitesi", city: "Ankara" });
    await setDoc(doc(db, "users/deniz"), profile("odtu"));
    await setDoc(doc(db, "users/ece"), profile("itu"));
    await setDoc(doc(db, "userPrivate/deniz"), { privacy: { profileVisibility: "campus" } });
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("universities", () => {
  it("oturum açmış kullanıcı okuyabilir", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("yeni").firestore(), "universities/odtu")));
  });

  it("anonim okuyamaz", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "universities/odtu")));
  });

  it("moderatör dahil kimse istemciden yazamaz", async () => {
    const db = env.authenticatedContext("mod", { moderator: true }).firestore();
    await assertFails(setDoc(doc(db, "universities/sahte"), { name: "Sahte", city: "X" }));
  });
});

describe("users (herkese açık profil)", () => {
  it("sahibi doğrulanmamış olsa da kendi profilini okur", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("deniz").firestore(), "users/deniz")));
  });

  it("aynı üniversitedeki doğrulanmış öğrenci okur", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("ali", odtuVerified).firestore(), "users/deniz")));
  });

  it("başka üniversitedeki doğrulanmış öğrenci okuyamaz", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("ali", ituVerified).firestore(), "users/deniz")));
  });

  it("doğrulanmamış kullanıcı başkasının profilini okuyamaz", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("ali").firestore(), "users/deniz")));
  });

  it("universityId claim'i olmadan verified claim'i yetmez", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("ali", { verified: true }).firestore(), "users/deniz")));
  });

  it("moderatör okuyabilir", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("mod", { moderator: true }).firestore(), "users/ece")));
  });

  it("sahibi profilini doğrudan oluşturamaz", async () => {
    await assertFails(setDoc(doc(env.authenticatedContext("yeni").firestore(), "users/yeni"), profile("odtu")));
  });

  it("sahibi doğrulama durumunu değiştiremez", async () => {
    const db = env.authenticatedContext("deniz").firestore();
    await assertFails(updateDoc(doc(db, "users/deniz"), { verificationStatus: "verified" }));
  });

  it("sahibi itibar puanını değiştiremez", async () => {
    const db = env.authenticatedContext("deniz").firestore();
    await assertFails(updateDoc(doc(db, "users/deniz"), { reputationScore: 100 }));
  });

  it("sahibi düzenlenebilir alanı bile doğrudan yazamaz (yalnızca callable)", async () => {
    const db = env.authenticatedContext("deniz").firestore();
    await assertFails(updateDoc(doc(db, "users/deniz"), { bio: "merhaba" }));
  });

  it("sahibi profilini doğrudan silemez", async () => {
    await assertFails(deleteDoc(doc(env.authenticatedContext("deniz").firestore(), "users/deniz")));
  });
});

describe("userPrivate", () => {
  it("yalnızca sahibi okur", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("deniz").firestore(), "userPrivate/deniz")));
    await assertFails(getDoc(doc(env.authenticatedContext("ali", odtuVerified).firestore(), "userPrivate/deniz")));
  });

  it("moderatör bile başkasının özel belgesini okuyamaz", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("mod", { moderator: true }).firestore(), "userPrivate/deniz")));
  });

  it("sahibi doğrudan yazamaz", async () => {
    const db = env.authenticatedContext("deniz").firestore();
    await assertFails(setDoc(doc(db, "userPrivate/deniz"), { privacy: { profileVisibility: "public" } }));
  });
});
