import { describe, expect, it } from "vitest";
import { adjustCount, countLabel } from "./labels";

describe("adjustCount", () => {
  it("yüklenirken sunucu sayısını gösterir, negatifi sıfıra çeker", () => {
    expect(adjustCount(3, { status: "loading" })).toBe(3);
    expect(adjustCount(-1, { status: "error" })).toBe(0);
  });

  it("sayfadaki beğeni/üyelik değişikliğini yansıtır", () => {
    const ready = (on: boolean, initial: boolean) => ({ status: "ready" as const, on, initial, busy: false });
    expect(adjustCount(3, ready(true, false))).toBe(4);
    expect(adjustCount(3, ready(false, true))).toBe(2);
    expect(adjustCount(3, ready(true, true))).toBe(3);
    expect(adjustCount(0, ready(false, true))).toBe(0);
  });
});

describe("countLabel", () => {
  it("Türkçe sayı biçimiyle yazar", () => {
    expect(countLabel(1250, "beğeni")).toBe("1.250 beğeni");
  });
});
