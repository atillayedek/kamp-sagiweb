import { describe, expect, it } from "vitest";
import { purgeDateFrom } from "./retention";

describe("purgeDateFrom", () => {
  it("karar tarihine saklama süresini ekler", () => {
    expect(purgeDateFrom(new Date("2026-09-25T10:00:00.000Z"), 30).toISOString()).toBe("2026-10-25T10:00:00.000Z");
  });
});
