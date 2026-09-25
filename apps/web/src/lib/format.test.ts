import { describe, expect, it } from "vitest";
import { formatMegabytes, formatPercent, initials } from "./format";

describe("formatPercent", () => {
  it("Türkçe yüzde biçimini kullanır", () => {
    expect(formatPercent(92)).toBe("%92");
  });

  it("değeri 0–100 aralığına sıkıştırır", () => {
    expect(formatPercent(140)).toBe("%100");
    expect(formatPercent(-5)).toBe("%0");
  });
});

describe("formatMegabytes", () => {
  it("ondalık ayırıcı olarak virgül kullanır", () => {
    expect(formatMegabytes(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
});

describe("initials", () => {
  it("Türkçe büyük harf kuralını uygular", () => {
    expect(initials("ilker ışık")).toBe("İI");
  });

  it("tek kelimede yalnızca ilk harfi döndürür", () => {
    expect(initials("  zeynep ")).toBe("Z");
  });
});
