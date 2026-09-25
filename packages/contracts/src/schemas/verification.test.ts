import { describe, expect, it } from "vitest";
import { reviewVerificationRequestSchema, verificationRequestIdSchema, verificationStoragePath } from "../index";

describe("verificationRequestIdSchema", () => {
  it("UUID biçimini kabul eder", () => {
    expect(verificationRequestIdSchema.safeParse("4f1c2d3e-5a6b-4c7d-8e9f-0a1b2c3d4e5f").success).toBe(true);
  });

  it("yol geçişi denemesini reddeder", () => {
    expect(verificationRequestIdSchema.safeParse("../../users/x").success).toBe(false);
    expect(verificationRequestIdSchema.safeParse("a/b").success).toBe(false);
  });
});

describe("verificationStoragePath", () => {
  it("kullanıcıya özel yolu üretir", () => {
    expect(verificationStoragePath("u1", "abcdefgh")).toBe("verification/u1/abcdefgh.pdf");
  });
});

describe("reviewVerificationRequestSchema", () => {
  it("red için sebep ister", () => {
    expect(reviewVerificationRequestSchema.safeParse({ requestId: "abcdefgh", decision: "reject" }).success).toBe(false);
    expect(
      reviewVerificationRequestSchema.safeParse({ requestId: "abcdefgh", decision: "reject", rejectReason: "unreadable" }).success,
    ).toBe(true);
  });

  it("onayda sebep istemez", () => {
    expect(reviewVerificationRequestSchema.safeParse({ requestId: "abcdefgh", decision: "approve" }).success).toBe(true);
  });

  it("bilinmeyen sebebi reddeder", () => {
    expect(
      reviewVerificationRequestSchema.safeParse({ requestId: "abcdefgh", decision: "reject", rejectReason: "keyfi" }).success,
    ).toBe(false);
  });
});
