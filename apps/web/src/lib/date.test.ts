import { describe, expect, it } from "vitest";
import { formatDateTime } from "./date";

describe("formatDateTime", () => {
  it("İstanbul saatine göre Türkçe biçimler", () => {
    expect(formatDateTime("2026-09-25T10:00:00.000Z")).toContain("13:00");
    expect(formatDateTime("2026-09-25T10:00:00.000Z")).toContain("Eyl");
  });

  it("boş veya bozuk değerde tire döner", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("dün")).toBe("—");
  });
});
