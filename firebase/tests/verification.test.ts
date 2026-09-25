import { VERIFICATION_MAX_BYTES } from "@kampusagi/contracts";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes, uploadString } from "firebase/storage";
import { afterAll, beforeAll, describe, it } from "vitest";
import { createTestEnv } from "./setup";

let env: RulesTestEnvironment;

const pdf = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
const pdfMeta = { contentType: "application/pdf" };
const request = { uid: "deniz", universityId: "odtu", storagePath: "verification/deniz/istek-0001.pdf", status: "pending" };

beforeAll(async () => {
  env = await createTestEnv();
  await env.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(ref(context.storage(), "verification/deniz/istek-0001.pdf"), pdf, pdfMeta);
    await setDoc(doc(context.firestore(), "verificationRequests/istek-0001"), request);
    await setDoc(doc(context.firestore(), "moderationLogs/log-1"), { action: "verification.approve", actorUid: "mod" });
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("Storage: öğrenci belgesi", () => {
  it("sahibi kendi yoluna PDF yükleyebilir", async () => {
    const storage = env.authenticatedContext("deniz").storage();
    await assertSucceeds(uploadBytes(ref(storage, "verification/deniz/istek-0002.pdf"), pdf, pdfMeta));
  });

  it("başkasının yoluna yükleyemez", async () => {
    const storage = env.authenticatedContext("ali").storage();
    await assertFails(uploadBytes(ref(storage, "verification/deniz/istek-0003.pdf"), pdf, pdfMeta));
  });

  it("PDF dışı içerik türünü reddeder", async () => {
    const storage = env.authenticatedContext("deniz").storage();
    await assertFails(uploadBytes(ref(storage, "verification/deniz/istek-0004.pdf"), pdf, { contentType: "image/png" }));
  });

  it("geçersiz dosya adını reddeder", async () => {
    const storage = env.authenticatedContext("deniz").storage();
    await assertFails(uploadBytes(ref(storage, "verification/deniz/belge.exe"), pdf, pdfMeta));
    await assertFails(uploadBytes(ref(storage, "verification/deniz/kisa.pdf"), pdf, pdfMeta));
  });

  it("boyut sınırını aşan dosyayı reddeder (sözleşmeyle aynı sınır)", async () => {
    const storage = env.authenticatedContext("deniz").storage();
    const big = new Uint8Array(VERIFICATION_MAX_BYTES + 1);
    big.set(pdf);
    await assertFails(uploadBytes(ref(storage, "verification/deniz/istek-buyuk.pdf"), big, pdfMeta));
  });

  it("var olan belgenin üzerine yazılamaz ve silinemez", async () => {
    const storage = env.authenticatedContext("deniz").storage();
    await assertFails(uploadString(ref(storage, "verification/deniz/istek-0001.pdf"), "%PDF-yeni", "raw", pdfMeta));
    await assertFails(deleteObject(ref(storage, "verification/deniz/istek-0001.pdf")));
  });

  it("sahibi ve moderatör okuyabilir, diğerleri okuyamaz", async () => {
    await assertSucceeds(getBytes(ref(env.authenticatedContext("deniz").storage(), "verification/deniz/istek-0001.pdf")));
    await assertSucceeds(
      getBytes(ref(env.authenticatedContext("mod", { moderator: true }).storage(), "verification/deniz/istek-0001.pdf")),
    );
    await assertFails(
      getBytes(ref(env.authenticatedContext("ali", { verified: true, universityId: "odtu" }).storage(), "verification/deniz/istek-0001.pdf")),
    );
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), "verification/deniz/istek-0001.pdf")));
  });
});

describe("Firestore: verificationRequests", () => {
  it("sahibi kendi isteğini okur", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("deniz").firestore(), "verificationRequests/istek-0001")));
  });

  it("başkası okuyamaz", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("ali").firestore(), "verificationRequests/istek-0001")));
  });

  it("moderatör bekleyen kuyruğu sorgulayabilir", async () => {
    const db = env.authenticatedContext("mod", { moderator: true }).firestore();
    await assertSucceeds(getDocs(query(collection(db, "verificationRequests"), where("status", "==", "pending"))));
  });

  it("moderatör olmayan kuyruğu sorgulayamaz", async () => {
    const db = env.authenticatedContext("ali", { verified: true, universityId: "odtu" }).firestore();
    await assertFails(getDocs(query(collection(db, "verificationRequests"), where("status", "==", "pending"))));
  });

  it("sahibi durumu değiştiremez ve istek oluşturamaz", async () => {
    const db = env.authenticatedContext("deniz").firestore();
    await assertFails(updateDoc(doc(db, "verificationRequests/istek-0001"), { status: "approved" }));
    await assertFails(setDoc(doc(db, "verificationRequests/yeni-istek-1"), { ...request, status: "approved" }));
  });

  it("moderatör bile istemciden durum değiştiremez", async () => {
    const db = env.authenticatedContext("mod", { moderator: true }).firestore();
    await assertFails(updateDoc(doc(db, "verificationRequests/istek-0001"), { status: "approved" }));
  });
});

describe("Firestore: moderationLogs", () => {
  it("yalnızca moderatör okur, kimse yazamaz", async () => {
    const mod = env.authenticatedContext("mod", { moderator: true }).firestore();
    await assertSucceeds(getDoc(doc(mod, "moderationLogs/log-1")));
    await assertFails(setDoc(doc(mod, "moderationLogs/log-2"), { action: "verification.approve" }));
    await assertFails(getDoc(doc(env.authenticatedContext("deniz").firestore(), "moderationLogs/log-1")));
  });
});
