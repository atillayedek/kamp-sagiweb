const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

export const PDF_SIGNATURE_LENGTH = PDF_SIGNATURE.length;

export function hasPdfSignature(header: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => header[index] === byte);
}
