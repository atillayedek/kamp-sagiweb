import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError } from "firebase-functions/v2/https";
import { beforeAll, describe, expect, it } from "vitest";
import {
  purgeExpiredVerificationFiles,
  purgeOrphanVerificationFiles,
  reviewVerification,
  submitVerification,
  syncVerificationClaims,
} from "./service";

const app = initializeApp({ projectId: "demo-kampusagi", storageBucket: "demo-kampusagi.appspot.com" }, "service-test");
const firestore = getFirestore(app);
const auth = getAuth(app);
const bucket = getStorage(app).bucket();

const PDF = Buffer.from("%PDF-1.4\n1 0 obj <</Type/Catalog>> endobj\n%%EOF\n");
const run = `${Date.now()}`;

async function createStudent(name: string) {
  const user = await auth.createUser({ email: `${name}-${run}@example.com`, password: "gecici-sifre-123" });
  await firestore.doc(`users/${user.uid}`).set({
    displayName: name,
    universityId: "odtu",
    department: "Bilgisayar",
    interests: [],
    skills: [],
    bio: "",
    verificationStatus: "unverified",
    reputationScore: null,
  });
  return user.uid;
}

async function upload(uid: string, requestId: string, content = PDF, contentType = "application/pdf") {
  await bucket.file(`verification/${uid}/${requestId}.pdf`).save(content, { contentType });
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpsError) return (error.details as { appCode?: string } | undefined)?.appCode;
    throw error;
  }
  return "başarılı";
}

let student: string;
let moderator: string;
const requestId = `istek-onay-${run}`;

beforeAll(async () => {
  student = await createStudent("deniz");
  moderator = (await auth.createUser({ email: `mod-${run}@example.com` })).uid;
  await auth.setCustomUserClaims(moderator, { moderator: true });
});

describe("submitVerification", () => {
  it("yüklenmemiş belgeyi reddeder", async () => {
    expect(await codeOf(submitVerification({ firestore, bucket }, student, `yok-${run}`))).toBe("failed-precondition");
  });

  it("PDF gibi görünen sahte dosyayı reddeder ve siler", async () => {
    const fakeId = `istek-sahte-${run}`;
    await upload(student, fakeId, Buffer.from("merhaba dünya"));
    expect(await codeOf(submitVerification({ firestore, bucket }, student, fakeId))).toBe("invalid-argument");
    const [exists] = await bucket.file(`verification/${student}/${fakeId}.pdf`).exists();
    expect(exists).toBe(false);
  });

  it("geçerli belgeyle başvuruyu oluşturur", async () => {
    await upload(student, requestId);
    await expect(submitVerification({ firestore, bucket }, student, requestId)).resolves.toEqual({ status: "pending" });
    expect((await firestore.doc(`users/${student}`).get()).get("verificationStatus")).toBe("pending");
    expect((await firestore.doc(`verificationRequests/${requestId}`).get()).data()).toMatchObject({
      uid: student,
      universityId: "odtu",
      status: "pending",
    });
    expect((await firestore.doc(`userPrivate/${student}`).get()).get("verification.status")).toBe("pending");
  });

  it("aynı istek tekrar gönderilince idempotenttir", async () => {
    await expect(submitVerification({ firestore, bucket }, student, requestId)).resolves.toEqual({ status: "pending" });
  });

  it("bekleyen başvuru varken ikincisini reddeder ve yüklenen dosyayı siler", async () => {
    const secondId = `istek-ikinci-${run}`;
    await upload(student, secondId);
    expect(await codeOf(submitVerification({ firestore, bucket }, student, secondId))).toBe("failed-precondition");
    const [exists] = await bucket.file(`verification/${student}/${secondId}.pdf`).exists();
    expect(exists).toBe(false);
  });
});

describe("reviewVerification", () => {
  it("moderatör kendi başvurusunu inceleyemez", async () => {
    expect(await codeOf(reviewVerification({ firestore, auth }, student, { requestId, decision: "approve" }))).toBe(
      "permission-denied",
    );
  });

  it("onay claim'leri, durumu ve denetim kaydını yazar", async () => {
    await auth.setCustomUserClaims(student, { betaTester: true });
    await expect(reviewVerification({ firestore, auth }, moderator, { requestId, decision: "approve" })).resolves.toEqual({
      status: "approved",
    });
    expect((await auth.getUser(student)).customClaims).toEqual({ betaTester: true, verified: true, universityId: "odtu" });
    expect((await firestore.doc(`users/${student}`).get()).get("verificationStatus")).toBe("verified");
    const request = (await firestore.doc(`verificationRequests/${requestId}`).get()).data();
    expect(request).toMatchObject({ status: "approved", reviewedBy: moderator, rejectReason: null });
    const logs = await firestore.collection("moderationLogs").where("targetUid", "==", student).get();
    expect(logs.docs.map((doc) => doc.get("action"))).toEqual(["verification.approve"]);
  });

  it("aynı karar tekrar gelince idempotenttir, çelişen karar reddedilir", async () => {
    await expect(reviewVerification({ firestore, auth }, moderator, { requestId, decision: "approve" })).resolves.toEqual({
      status: "approved",
    });
    expect(
      await codeOf(reviewVerification({ firestore, auth }, moderator, { requestId, decision: "reject", rejectReason: "other" })),
    ).toBe("failed-precondition");
  });

  it("red claim vermez, sebebi özel belgeye yazar ve yeniden başvuruya izin verir", async () => {
    const other = await createStudent("ece");
    const rejectId = `istek-red-${run}`;
    await upload(other, rejectId);
    await submitVerification({ firestore, bucket }, other, rejectId);
    await expect(
      reviewVerification({ firestore, auth }, moderator, { requestId: rejectId, decision: "reject", rejectReason: "unreadable", note: " Bulanık " }),
    ).resolves.toEqual({ status: "rejected" });
    expect((await auth.getUser(other)).customClaims ?? {}).not.toHaveProperty("verified");
    expect((await firestore.doc(`users/${other}`).get()).get("verificationStatus")).toBe("rejected");
    expect((await firestore.doc(`userPrivate/${other}`).get()).get("verification")).toMatchObject({
      status: "rejected",
      rejectReason: "unreadable",
      note: "Bulanık",
    });
    const retryId = `istek-tekrar-${run}`;
    await upload(other, retryId);
    await expect(submitVerification({ firestore, bucket }, other, retryId)).resolves.toEqual({ status: "pending" });
  });

  it("eşzamanlı iki onayda kullanıcı claim'siz kalmaz", async () => {
    const racer = await createStudent("yaris");
    const raceId = `istek-yaris-${run}`;
    await upload(racer, raceId);
    await submitVerification({ firestore, bucket }, racer, raceId);
    const second = (await auth.createUser({ email: `mod2-${run}@example.com` })).uid;
    const results = await Promise.allSettled([
      reviewVerification({ firestore, auth }, moderator, { requestId: raceId, decision: "approve" }),
      reviewVerification({ firestore, auth }, second, { requestId: raceId, decision: "approve" }),
    ]);
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    expect((await auth.getUser(racer)).customClaims).toMatchObject({ verified: true, universityId: "odtu" });
    expect((await firestore.doc(`users/${racer}`).get()).get("verificationStatus")).toBe("verified");
  });

  it("olmayan başvuru not-found döner", async () => {
    expect(await codeOf(reviewVerification({ firestore, auth }, moderator, { requestId: `yok-${run}`, decision: "approve" }))).toBe(
      "not-found",
    );
  });
});

describe("syncVerificationClaims", () => {
  it("doğrulanmış kullanıcının kaybolan claim'ini onarır", async () => {
    await auth.setCustomUserClaims(student, { betaTester: true });
    await expect(syncVerificationClaims({ firestore, auth }, student)).resolves.toEqual({ verified: true });
    expect((await auth.getUser(student)).customClaims).toEqual({ betaTester: true, verified: true, universityId: "odtu" });
  });

  it("doğrulanmamış kullanıcıdaki yetkisiz verified claim'ini kaldırır", async () => {
    const intruder = await createStudent("izinsiz");
    await auth.setCustomUserClaims(intruder, { verified: true, universityId: "odtu", moderator: false });
    await expect(syncVerificationClaims({ firestore, auth }, intruder)).resolves.toEqual({ verified: false });
    expect((await auth.getUser(intruder)).customClaims).toEqual({ moderator: false });
  });
});

describe("purgeOrphanVerificationFiles", () => {
  it("başvuruya dönüşmemiş eski dosyayı siler, başvurusu olanı korur", async () => {
    const orphanId = `istek-yetim-${run}`;
    await upload(student, orphanId);
    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(await purgeOrphanVerificationFiles({ firestore, bucket }, new Date())).toBe(0);
    expect(await purgeOrphanVerificationFiles({ firestore, bucket }, tomorrow)).toBeGreaterThanOrEqual(1);
    expect((await bucket.file(`verification/${student}/${orphanId}.pdf`).exists())[0]).toBe(false);
    expect((await bucket.file(`verification/${student}/${requestId}.pdf`).exists())[0]).toBe(true);
  });
});

describe("purgeExpiredVerificationFiles", () => {
  it("süresi dolan belgeleri siler ve bir daha işlemez", async () => {
    const later = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(await purgeExpiredVerificationFiles({ firestore, bucket }, later)).toBeGreaterThanOrEqual(1);
    const [exists] = await bucket.file(`verification/${student}/${requestId}.pdf`).exists();
    expect(exists).toBe(false);
    expect((await firestore.doc(`verificationRequests/${requestId}`).get()).get("fileDeletedAt")).toBeDefined();
    expect(await purgeExpiredVerificationFiles({ firestore, bucket }, later)).toBe(0);
  });

  it("süresi dolmamış belgelere dokunmaz", async () => {
    expect(await purgeExpiredVerificationFiles({ firestore, bucket }, new Date())).toBe(0);
  });
});
