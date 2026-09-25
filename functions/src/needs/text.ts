import type { MaskedPiiKind } from "@kampusagi/contracts";

const INVISIBLE = /[\u00ad\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g;
const SYMBOL_RUN = /([^\p{L}\p{N}\s])\1{3,}/gu;
const LOCAL_DIGITS = /[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef]/g;
const LOCAL_DIGIT_ZEROS = [0x0660, 0x06f0, 0x0966, 0x09e6];

function toAsciiDigit(character: string): string {
  const code = character.codePointAt(0)!;
  const zero = LOCAL_DIGIT_ZEROS.find((start) => code >= start && code <= start + 9)!;
  return String(code - zero);
}

export function cleanNeedText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(LOCAL_DIGITS, toAsciiDigit)
    .replace(INVISIBLE, "")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, " ")
    .replace(SYMBOL_RUN, "$1$1$1")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanLine(input: string): string {
  return cleanNeedText(input).replace(/\s+/g, " ");
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
const TR_IBAN = /(?<![\p{L}\p{N}])TR[\s./_-]?\d{2}(?:[\s./_-]{0,2}\d){22}(?!\p{N})/giu;
const DIGIT_GROUP = /(?<![\p{L}\p{N}])(?:\+\s?)?\(?\d(?:[\s./_()-]{0,3}\d)+(?!\p{N})/gu;

const REPLACEMENTS: Record<MaskedPiiKind, string> = {
  email: "[e-posta]",
  iban: "[IBAN]",
  phone: "[telefon]",
  tckn: "[TC kimlik no]",
};

function isTurkishPhone(digits: string): boolean {
  let national = digits;
  if (digits.startsWith("0090")) national = digits.slice(4);
  else if (digits.startsWith("90") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  return national.length === 10 && /^[2-5]/.test(national);
}

export function isValidTckn(digits: string): boolean {
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  const n = [...digits].map(Number);
  const odd = n[0]! + n[2]! + n[4]! + n[6]! + n[8]!;
  const even = n[1]! + n[3]! + n[5]! + n[7]!;
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = n.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;
  return n[9] === tenth && n[10] === eleventh;
}

function classifyDigitGroup(raw: string): { kind: MaskedPiiKind; replacement: string } | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 16) return { kind: "iban", replacement: "[hesap no]" };
  if (raw.trimStart().startsWith("+") && digits.length >= 8) return { kind: "phone", replacement: REPLACEMENTS.phone };
  if (isTurkishPhone(digits)) return { kind: "phone", replacement: REPLACEMENTS.phone };
  if (digits.length === 11 && (/^[1-9]\d{10}$/.test(raw) || isValidTckn(digits))) {
    return { kind: "tckn", replacement: REPLACEMENTS.tckn };
  }
  return null;
}

export type MaskResult = { text: string; kinds: MaskedPiiKind[] };

export function maskPii(input: string): MaskResult {
  const kinds = new Set<MaskedPiiKind>();
  let text = input;
  if (text.includes("@")) {
    text = text.replace(EMAIL, () => {
      kinds.add("email");
      return REPLACEMENTS.email;
    });
  }
  text = text.replace(TR_IBAN, () => {
    kinds.add("iban");
    return REPLACEMENTS.iban;
  });
  text = text.replace(DIGIT_GROUP, (group) => {
    const match = classifyDigitGroup(group);
    if (!match) return group;
    kinds.add(match.kind);
    return match.replacement;
  });
  return { text, kinds: [...kinds] };
}

export function truncateText(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}
