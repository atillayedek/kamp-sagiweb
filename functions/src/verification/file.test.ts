import { VERIFICATION_MAX_BYTES } from "@kampusagi/contracts";
import { describe, expect, it } from "vitest";
import { inspectVerificationFile } from "./file";

const header = new TextEncoder().encode("%PDF-");

describe("inspectVerificationFile", () => {
  it("geçerli PDF'i kabul eder", () => {
    expect(inspectVerificationFile({ contentType: "application/pdf", size: 1000, header })).toBeNull();
  });

  it("içerik türü farklıysa reddeder", () => {
    expect(inspectVerificationFile({ contentType: "image/png", size: 1000, header })).toBe("wrong-type");
  });

  it("boş ve büyük dosyayı reddeder", () => {
    expect(inspectVerificationFile({ contentType: "application/pdf", size: 0, header })).toBe("empty");
    expect(inspectVerificationFile({ contentType: "application/pdf", size: VERIFICATION_MAX_BYTES + 1, header })).toBe(
      "too-large",
    );
  });

  it("içerik türü doğru ama imzası PDF olmayan dosyayı reddeder", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    expect(inspectVerificationFile({ contentType: "application/pdf", size: 1000, header: png })).toBe("not-pdf");
  });
});
