import { describe, expect, it } from "vitest";
import { formatTagInput, parseTagInput } from "./tags";

describe("parseTagInput", () => {
  it("virgülle ayırır, kırpar, Türkçe küçük harfe çevirir ve tekilleştirir", () => {
    expect(parseTagInput(" Basketbol, İzcilik ,basketbol,, ")).toEqual(["basketbol", "izcilik"]);
  });

  it("boş girdide boş liste döner", () => {
    expect(parseTagInput("  ")).toEqual([]);
  });
});

describe("formatTagInput", () => {
  it("etiketleri düzenlenebilir metne çevirir", () => {
    expect(formatTagInput(["python", "veri"])).toBe("python, veri");
  });
});
