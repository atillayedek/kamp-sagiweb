import { completeOnboardingRequestSchema, LEGAL_TERMS_VERSION } from "@kampusagi/contracts";
import { describe, expect, it } from "vitest";
import { newProfileDocuments } from "./documents";

const input = completeOnboardingRequestSchema.parse({
  displayName: "Deniz",
  universityId: "odtu",
  department: "Bilgisayar Mühendisliği",
  interests: ["Basketbol"],
  skills: [],
  bio: "",
  acceptedTermsVersion: LEGAL_TERMS_VERSION,
});

describe("newProfileDocuments", () => {
  const docs = newProfileDocuments(input, "ZAMAN");

  it("sunucu alanlarını güvenli varsayılanlarla başlatır", () => {
    expect(docs.profile.verificationStatus).toBe("unverified");
    expect(docs.profile.reputationScore).toBeNull();
  });

  it("koşul kabulünü sürümüyle kaydeder", () => {
    expect(docs.private.legal).toEqual({ acceptedTermsVersion: LEGAL_TERMS_VERSION, acceptedAt: "ZAMAN" });
  });

  it("herkese açık profile yalnızca izinli alanları yazar", () => {
    expect(Object.keys(docs.profile).sort()).toEqual(
      [
        "bio",
        "createdAt",
        "department",
        "displayName",
        "interests",
        "reputationScore",
        "skills",
        "universityId",
        "updatedAt",
        "verificationStatus",
      ].sort(),
    );
  });

  it("e-posta gibi kimlik bilgilerini Firestore'a kopyalamaz", () => {
    expect(JSON.stringify(docs)).not.toContain("@");
  });
});
