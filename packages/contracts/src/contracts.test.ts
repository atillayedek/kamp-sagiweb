import { describe, expect, it } from "vitest";
import { z } from "zod";
import { callables, customClaimsSchema, pingRequestSchema, pingResponseSchema, universityIdSchema } from "./index";

describe("callable sözleşmeleri", () => {
  it("callable adları sürüm önekli ve benzersiz", () => {
    const names = Object.values(callables).map((callable) => callable.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^v\d+-[a-z][A-Za-z0-9]*$/);
  });

  it.each(Object.entries(callables))("%s şemaları iOS için JSON Schema'ya dönüştürülebilir", (_key, callable) => {
    expect(() => z.toJSONSchema(callable.request)).not.toThrow();
    expect(() => z.toJSONSchema(callable.response)).not.toThrow();
  });
});

describe("ping", () => {
  it("bilinmeyen alanları reddeder", () => {
    expect(pingRequestSchema.safeParse({ isAdmin: true }).success).toBe(false);
  });

  it("geçerli yanıtı kabul eder", () => {
    const result = pingResponseSchema.safeParse({ ok: true, serverTime: "2026-09-25T12:00:00.000Z", contractVersion: 1 });
    expect(result.success).toBe(true);
  });
});

describe("custom claim'ler", () => {
  it("beklenmeyen claim türünü reddeder", () => {
    expect(customClaimsSchema.safeParse({ moderator: "evet" }).success).toBe(false);
  });

  it("üniversite kimliği biçimini doğrular", () => {
    expect(universityIdSchema.safeParse("odtu").success).toBe(true);
    expect(universityIdSchema.safeParse("ODTÜ").success).toBe(false);
  });
});
