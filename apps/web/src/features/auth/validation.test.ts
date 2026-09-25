import { describe, expect, it } from "vitest";
import { emailError, passwordError } from "./validation";

describe("emailError", () => {
  it("geçerli adresi kabul eder", () => {
    expect(emailError(" ogrenci@ornek.edu.tr ")).toBeUndefined();
  });

  it("geçersiz adreste Türkçe hata döner", () => {
    expect(emailError("ogrenci@")).toBe("Geçerli bir e-posta adresi gir.");
  });
});

describe("passwordError", () => {
  it("8 karakterden kısa şifreyi reddeder", () => {
    expect(passwordError("1234567")).toBe("Şifre en az 8 karakter olmalı.");
    expect(passwordError("12345678")).toBeUndefined();
  });
});
