import { hasPdfSignature, VERIFICATION_MAX_BYTES } from "@kampusagi/contracts";

export type StoredFileFacts = {
  contentType: string | undefined;
  size: number;
  header: Uint8Array;
};

export type FileProblem = "wrong-type" | "empty" | "too-large" | "not-pdf";

export function inspectVerificationFile(facts: StoredFileFacts): FileProblem | null {
  if (facts.contentType !== "application/pdf") return "wrong-type";
  if (!Number.isFinite(facts.size) || facts.size <= 0) return "empty";
  if (facts.size > VERIFICATION_MAX_BYTES) return "too-large";
  if (!hasPdfSignature(facts.header)) return "not-pdf";
  return null;
}

export const fileProblemMessages: Record<FileProblem, string> = {
  "wrong-type": "Yalnızca PDF dosyası kabul edilir.",
  empty: "Dosya boş görünüyor.",
  "too-large": "Dosya boyut sınırını aşıyor.",
  "not-pdf": "Dosya geçerli bir PDF değil.",
};
