import { LEGAL_TERMS_VERSION, publicProfileSchema, type CompleteOnboardingRequest } from "@kampusagi/contracts";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEmulators, seedUniversities } from "../../../../../scripts/seed-emulator.mjs";
import { createFirebaseClients, defaultEmulatorHosts } from "./clients";
import { FirebaseDocumentSource } from "./documents";
import { FirebaseFunctionsConnector } from "./functions";

const clients = createFirebaseClients(
  { apiKey: "demo-api-key", projectId: "demo-kampusagi", storageBucket: "demo-kampusagi.appspot.com" },
  { appName: "profile-emulator-test", emulators: defaultEmulatorHosts },
);
const functions = new FirebaseFunctionsConnector(clients.functions);
const documents = new FirebaseDocumentSource(clients.firestore);

const onboarding: CompleteOnboardingRequest = {
  displayName: "Deniz",
  department: "Bilgisayar Mühendisliği",
  interests: ["Basketbol"],
  skills: [],
  bio: "",
  universityId: "orta-dogu-teknik",
  acceptedTermsVersion: LEGAL_TERMS_VERSION,
};

beforeAll(async () => {
  await resetEmulators();
  await seedUniversities();
  await createUserWithEmailAndPassword(clients.auth, `profil-${Date.now()}@example.com`, "gecici-sifre-123");
});

afterAll(async () => {
  await signOut(clients.auth);
});

describe("profil callable'ları", () => {
  it("profil yokken güncelleme failed-precondition döner", async () => {
    await expect(functions.call("updateProfile", { bio: "merhaba" })).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("olmayan üniversite reddedilir", async () => {
    await expect(functions.call("completeOnboarding", { ...onboarding, universityId: "olmayan" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("sunucu alanı gönderme denemesi şemada reddedilir", async () => {
    const tampered = { ...onboarding, verificationStatus: "verified" } as CompleteOnboardingRequest;
    await expect(functions.call("completeOnboarding", tampered)).rejects.toMatchObject({ code: "internal" });
  });

  it("profili oluşturur ve sunucu alanlarını güvenli varsayılanla yazar", async () => {
    await expect(functions.call("completeOnboarding", onboarding)).resolves.toEqual({ created: true });
    const uid = clients.auth.currentUser?.uid;
    const profile = await documents.getDocument(`users/${uid}`, publicProfileSchema);
    expect(profile).toMatchObject({ verificationStatus: "unverified", reputationScore: null, interests: ["basketbol"] });
    expect(profile?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("aynı istekle tekrar çağrı idempotenttir", async () => {
    await expect(functions.call("completeOnboarding", onboarding)).resolves.toEqual({ created: false });
  });

  it("üniversite sonradan değiştirilemez", async () => {
    await expect(functions.call("completeOnboarding", { ...onboarding, universityId: "istanbul-teknik" })).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("izinli alanı günceller", async () => {
    await expect(functions.call("updateProfile", { bio: "Akşamları basketbol." })).resolves.toEqual({ updated: true });
    const profile = await documents.getDocument(`users/${clients.auth.currentUser?.uid}`, publicProfileSchema);
    expect(profile?.bio).toBe("Akşamları basketbol.");
    expect(profile?.verificationStatus).toBe("unverified");
  });
});
