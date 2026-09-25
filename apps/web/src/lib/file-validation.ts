import { formatMegabytes } from "./format";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

export type PdfValidationResult = { ok: true } | { ok: false; message: string };

type FileLike = { name: string; type: string; size: number };

export function validatePdfMetadata(file: FileLike, maxBytes: number): PdfValidationResult {
  const looksLikePdf = file.type === "application/pdf" || file.name.toLocaleLowerCase("tr-TR").endsWith(".pdf");
  if (!looksLikePdf) return { ok: false, message: "Yalnızca PDF dosyası yükleyebilirsin." };
  if (file.size === 0) return { ok: false, message: "Dosya boş görünüyor. Lütfen belgeyi yeniden indirip dene." };
  if (file.size > maxBytes) return { ok: false, message: `Dosya en fazla ${formatMegabytes(maxBytes)} olabilir.` };
  return { ok: true };
}

export function hasPdfSignature(header: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => header[index] === byte);
}

export async function validatePdfFile(file: File, maxBytes: number): Promise<PdfValidationResult> {
  const metadata = validatePdfMetadata(file, maxBytes);
  if (!metadata.ok) return metadata;
  const header = new Uint8Array(await file.slice(0, PDF_SIGNATURE.length).arrayBuffer());
  if (!hasPdfSignature(header)) return { ok: false, message: "Dosya geçerli bir PDF değil." };
  return { ok: true };
}
