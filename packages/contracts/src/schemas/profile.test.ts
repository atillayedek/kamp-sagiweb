import { describe, expect, it } from "vitest";
import {
  completeOnboardingRequestSchema,
  editableProfileSchema,
  LEGAL_TERMS_VERSION,
  updateProfileRequestSchema,
} from "../index";

const valid = {
  displayName: "  Deniz Yılmaz ",
  department: "Bilgisayar Mühendisliği",
  interests: ["Basketbol", "basketbol", "İzcilik"],
  skills: ["Python"],
  bio: "",
};

describe("editableProfileSchema", () => {
  it("metni kırpar, etiketleri Türkçe küçük harfe çevirip tekilleştirir", () => {
    const parsed = editableProfileSchema.parse(valid);
    expect(parsed.displayName).toBe("Deniz Yılmaz");
    expect(parsed.interests).toEqual(["basketbol", "izcilik"]);
  });

  it("sunucu alanlarını reddeder", () => {
    expect(editableProfileSchema.safeParse({ ...valid, verificationStatus: "verified" }).success).toBe(false);
    expect(editableProfileSchema.safeParse({ ...valid, reputationScore: 100 }).success).toBe(false);
  });

  it("kontrol karakterlerini reddeder", () => {
    expect(editableProfileSchema.safeParse({ ...valid, displayName: "Deniz\u0000" }).success).toBe(false);
  });

  it("11 etiketi reddeder", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `etiket${i}`);
    expect(editableProfileSchema.safeParse({ ...valid, skills: tags }).success).toBe(false);
  });

  it("çok kısa adı reddeder", () => {
    expect(editableProfileSchema.safeParse({ ...valid, displayName: " D " }).success).toBe(false);
  });
});

describe("completeOnboardingRequestSchema", () => {
  it("güncel koşul sürümünü zorunlu tutar", () => {
    const request = { ...valid, universityId: "odtu", acceptedTermsVersion: LEGAL_TERMS_VERSION };
    expect(completeOnboardingRequestSchema.safeParse(request).success).toBe(true);
    expect(completeOnboardingRequestSchema.safeParse({ ...request, acceptedTermsVersion: "eski" }).success).toBe(false);
  });
});

describe("updateProfileRequestSchema", () => {
  it("boş güncellemeyi reddeder", () => {
    expect(updateProfileRequestSchema.safeParse({}).success).toBe(false);
  });

  it("universityId değişikliğini kabul etmez", () => {
    expect(updateProfileRequestSchema.safeParse({ universityId: "itu" }).success).toBe(false);
  });
});
