import { describe, expect, it } from "vitest";
import { AppError, toAppError } from "./errors";

describe("toAppError", () => {
  it("AppError'ı olduğu gibi döndürür", () => {
    const error = new AppError("not-found");
    expect(toAppError(error)).toBe(error);
  });

  it("callable details.appCode değerini önceler", () => {
    const error = toAppError({ code: "functions/permission-denied", details: { appCode: "not-verified" } });
    expect(error.code).toBe("not-verified");
    expect(error.message).toBe("Bu bölüm, öğrenci doğrulaman tamamlandığında açılacak.");
  });

  it("bozuk details değerini yok sayar", () => {
    expect(toAppError({ code: "functions/internal", details: { appCode: "admin" } }).code).toBe("internal");
  });

  it("Firestore kodlarını eşler", () => {
    expect(toAppError({ code: "permission-denied" }).code).toBe("permission-denied");
    expect(toAppError({ code: "unavailable" }).message).toContain("İnternet bağlantını");
  });

  it("Auth kodlarını Türkçe özel mesajla eşler", () => {
    const error = toAppError({ code: "auth/email-already-in-use" });
    expect(error.code).toBe("already-exists");
    expect(error.message).toBe("Bu e-posta adresiyle zaten bir hesap var.");
  });

  it("Storage iptalini cancelled olarak eşler", () => {
    expect(toAppError({ code: "storage/canceled" }).code).toBe("cancelled");
  });

  it("bilinmeyen hataları ham mesajı sızdırmadan unknown yapar", () => {
    const error = toAppError(new Error("stack: /srv/secret/path"));
    expect(error.code).toBe("unknown");
    expect(error.message).not.toContain("secret");
  });
});
