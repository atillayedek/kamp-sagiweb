import { createHash } from "node:crypto";

/** Belge kimliği olarak kullanılabilen kısa, deterministik özet (SHA-256'nın ilk 40 onaltılık hanesi). */
export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}
