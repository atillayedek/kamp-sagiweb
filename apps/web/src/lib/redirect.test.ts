import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PATH, safeNextPath, signInPath } from "./redirect";

describe("safeNextPath", () => {
  it.each([
    ["/profil", "/profil"],
    ["/kesfet?kategori=spor", "/kesfet?kategori=spor"],
  ])("göreli yolu kabul eder: %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://kotu.example.com",
    "//kotu.example.com",
    "/\\kotu.example.com",
    "javascript:alert(1)",
    "profil",
    "/\u0000profil",
    "",
    null,
    undefined,
  ])("açık yönlendirme denemesini reddeder: %s", (input) => {
    expect(safeNextPath(input)).toBe(DEFAULT_APP_PATH);
  });

  it("giriş yolunu kodlanmış next ile üretir", () => {
    expect(signInPath("/profil?a=1")).toBe("/giris?next=%2Fprofil%3Fa%3D1");
    expect(signInPath("//kotu.example.com")).toBe("/giris?next=%2Fprofil");
  });
});
