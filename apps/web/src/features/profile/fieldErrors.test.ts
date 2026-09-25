import { completeOnboardingRequestSchema } from "@kampusagi/contracts";
import { describe, expect, it } from "vitest";
import { profileFieldErrors } from "./fieldErrors";

describe("profileFieldErrors", () => {
  it("şema hatalarını alan bazlı Türkçe mesajlara çevirir", () => {
    const result = completeOnboardingRequestSchema.safeParse({
      displayName: "D",
      universityId: "",
      department: "Bilgisayar",
      interests: [],
      skills: [],
      bio: "",
      acceptedTermsVersion: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = profileFieldErrors(result.error);
    expect(errors.displayName).toBe("Adın 2–40 karakter olmalı.");
    expect(errors.universityId).toBe("Üniversiteni seç.");
    expect(errors.acceptedTermsVersion).toContain("Kullanım Şartları");
    expect(errors.department).toBeUndefined();
  });
});
