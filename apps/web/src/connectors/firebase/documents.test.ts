import { describe, expect, it } from "vitest";
import { normalizeFirestoreData } from "./documents";

describe("normalizeFirestoreData", () => {
  it("Timestamp benzeri değerleri iç içe yapılarda ISO metnine çevirir", () => {
    const at = { toDate: () => new Date("2026-09-25T10:00:00.000Z") };
    expect(normalizeFirestoreData({ createdAt: at, legal: { acceptedAt: at }, list: [at], name: "Deniz", n: null })).toEqual({
      createdAt: "2026-09-25T10:00:00.000Z",
      legal: { acceptedAt: "2026-09-25T10:00:00.000Z" },
      list: ["2026-09-25T10:00:00.000Z"],
      name: "Deniz",
      n: null,
    });
  });
});
