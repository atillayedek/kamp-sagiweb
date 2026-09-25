import { describe, expect, it } from "vitest";
import { hasPdfSignature, validatePdfMetadata } from "./file-validation";

const MB = 1024 * 1024;

describe("validatePdfMetadata", () => {
  it("PDF türünü kabul eder", () => {
    expect(validatePdfMetadata({ name: "belge.pdf", type: "application/pdf", size: MB }, 5 * MB)).toEqual({ ok: true });
  });

  it("büyük harfli uzantıyı kabul eder", () => {
    expect(validatePdfMetadata({ name: "BELGE.PDF", type: "", size: MB }, 5 * MB).ok).toBe(true);
  });

  it("PDF olmayan dosyayı reddeder", () => {
    const result = validatePdfMetadata({ name: "belge.png", type: "image/png", size: MB }, 5 * MB);
    expect(result).toEqual({ ok: false, message: "Yalnızca PDF dosyası yükleyebilirsin." });
  });

  it("boş dosyayı reddeder", () => {
    expect(validatePdfMetadata({ name: "belge.pdf", type: "application/pdf", size: 0 }, 5 * MB).ok).toBe(false);
  });

  it("boyut sınırını aşan dosyayı reddeder", () => {
    const result = validatePdfMetadata({ name: "belge.pdf", type: "application/pdf", size: 6 * MB }, 5 * MB);
    expect(result).toEqual({ ok: false, message: "Dosya en fazla 5 MB olabilir." });
  });
});

describe("hasPdfSignature", () => {
  it("%PDF- imzasını tanır", () => {
    expect(hasPdfSignature(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
  });

  it("uzantısı değiştirilmiş dosyayı yakalar", () => {
    expect(hasPdfSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(false);
  });

  it("kısa içeriği reddeder", () => {
    expect(hasPdfSignature(new TextEncoder().encode("%PD"))).toBe(false);
  });
});
