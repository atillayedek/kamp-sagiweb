import { describe, expect, it } from "vitest";
import { formatZonedIso, zonedDayKey, zonedLocalToDate, zonedParts } from "./time";

describe("saat dilimi yardımcıları", () => {
  it("İstanbul saatini offset ile biçimlendirir", () => {
    expect(formatZonedIso(new Date("2026-09-25T11:30:05Z"))).toBe("2026-09-25T14:30:05+03:00");
  });

  it("gün anahtarını İstanbul'a göre hesaplar", () => {
    expect(zonedDayKey(new Date("2026-09-25T21:30:00Z"))).toBe("2026-09-26");
    expect(zonedDayKey(new Date("2026-09-25T20:59:59Z"))).toBe("2026-09-25");
  });

  it("yerel saati UTC anına çevirir", () => {
    expect(zonedLocalToDate({ year: 2026, month: 9, day: 26, hour: 18, minute: 0 }).toISOString()).toBe(
      "2026-09-26T15:00:00.000Z",
    );
  });

  it("yaz saati uygulanan bölgelerde de tutarlıdır", () => {
    const date = zonedLocalToDate({ year: 2026, month: 7, day: 1, hour: 12, minute: 0 }, "Europe/Berlin");
    expect(date.toISOString()).toBe("2026-07-01T10:00:00.000Z");
    expect(formatZonedIso(date, "Europe/Berlin")).toBe("2026-07-01T12:00:00+02:00");
    expect(zonedParts(date, "Europe/Berlin").hour).toBe(12);
  });
});
