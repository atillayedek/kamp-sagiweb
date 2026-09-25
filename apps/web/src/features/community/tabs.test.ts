import { describe, expect, it } from "vitest";
import { communityTabFrom } from "./tabs";

describe("communityTabFrom", () => {
  it("yalnızca bilinen sekme adlarını kabul eder", () => {
    expect(communityTabFrom("kulupler")).toBe("kulupler");
    expect(communityTabFrom("admin")).toBeUndefined();
    expect(communityTabFrom(["kulupler"])).toBeUndefined();
    expect(communityTabFrom(undefined)).toBeUndefined();
  });
});
