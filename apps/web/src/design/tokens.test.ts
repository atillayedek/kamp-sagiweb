import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import { contrastPairs } from "./contrast-pairs";

const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");
const tokens = new Map(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1] as string, m[2] as string]),
);

describe("renk token'ları", () => {
  it.each(contrastPairs)("$usage: $foreground / $background ≥ $minimum", ({ foreground, background, minimum }) => {
    const fg = tokens.get(foreground);
    const bg = tokens.get(background);
    expect(fg, `--color-${foreground} tanımlı olmalı`).toBeDefined();
    expect(bg, `--color-${background} tanımlı olmalı`).toBeDefined();
    expect(contrastRatio(fg as string, bg as string)).toBeGreaterThanOrEqual(minimum);
  });

  it("kehribar vurgu metin rengi olarak kullanılamayacak kadar açık", () => {
    expect(contrastRatio(tokens.get("accent") as string, tokens.get("surface") as string)).toBeLessThan(4.5);
  });
});
