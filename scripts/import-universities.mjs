// İl–üniversite listesini (ör. kullanıcının verdiği `province-universities.json`) seed biçimine dönüştürür.
// Kullanım: node scripts/import-universities.mjs <kaynak.json> [hedef.json]
// Yalnızca kurum adı ve il alınır; telefon, faks, e-posta, adres, web sitesi ve rektör bilgisi veri
// minimizasyonu gereği alınmaz. Kaynaktaki il bilgisi değiştirilmez; şüpheli kayıtlar uyarı olarak yazdırılır.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const LOCALE = "tr-TR";
const ACRONYMS = new Set(["TED", "TOBB", "MEF", "KTO", "SANKO", "AKEV", "OSTİM"]);
const LOWERCASE_WORDS = new Set(["ve"]);
const ID_PATTERN = /^[a-z0-9-]{2,64}$/;

function capitalize(word) {
  const lower = word.toLocaleLowerCase(LOCALE);
  return lower.charAt(0).toLocaleUpperCase(LOCALE) + lower.slice(1);
}

function titleWord(word, first) {
  if (ACRONYMS.has(word.replace(/[^\p{L}]/gu, ""))) return word;
  if (/^\d/.test(word) || word === "-") return word;
  const lower = word.toLocaleLowerCase(LOCALE);
  if (!first && LOWERCASE_WORDS.has(lower)) return lower;
  // "BEZM-İ ÂLEM" → "Bezm-i Âlem", "TÜRK-ALMAN" → "Türk-Alman"
  return word
    .split("-")
    .map((part, index) => (index > 0 && part.length === 1 ? part.toLocaleLowerCase(LOCALE) : capitalize(part)))
    .join("-");
}

export function toTitleCase(value) {
  return value
    .trim()
    .split(/\s+/)
    .map((word, index) => titleWord(word, index === 0))
    .join(" ");
}

const FOLD = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

export function universityId(name) {
  const words = name
    .toLocaleLowerCase(LOCALE)
    .normalize("NFC")
    .replace(/[çğıiöşüâîû]/g, (char) => FOLD[char])
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word !== "universitesi");
  return words.join("-");
}

export function convert(source) {
  const universities = {};
  const warnings = [];
  for (const province of source) {
    const city = toTitleCase(province.province);
    for (const entry of province.universities) {
      const name = toTitleCase(entry.name);
      const id = universityId(entry.name);
      if (!ID_PATTERN.test(id)) throw new Error(`Geçersiz kimlik: ${id} (${entry.name})`);
      if (universities[id]) throw new Error(`Yinelenen kimlik: ${id} (${entry.name} / ${universities[id].name})`);
      universities[id] = { name, city };
      const nameCity = entry.name.split(/\s+/)[0];
      if (nameCity !== province.province && source.some((other) => other.province === nameCity)) {
        warnings.push(`${name}: adı "${toTitleCase(nameCity)}" ilini çağrıştırıyor, kaynakta il "${city}"`);
      }
    }
  }
  const sorted = Object.fromEntries(Object.entries(universities).sort(([a], [b]) => a.localeCompare(b)));
  return { universities: sorted, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output = fileURLToPath(new URL("../firebase/seed/universities.json", import.meta.url))] = process.argv.slice(2);
  if (!input) {
    console.error("Kullanım: node scripts/import-universities.mjs <kaynak.json> [hedef.json]");
    process.exit(1);
  }
  const { universities, warnings } = convert(JSON.parse(readFileSync(input, "utf8")));
  const document = {
    _kaynak:
      "Kullanıcının sağladığı il–üniversite listesinden üretildi (scripts/import-universities.mjs). Yalnızca kurum adı ve il alındı. " +
      "Emulator ve e2e bu dosyayı kullanır; üretime aktarım Faz 14'te onayla yapılır.",
    universities,
  };
  writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`${Object.keys(universities).length} kurum yazıldı: ${output}`);
  for (const warning of warnings) console.warn(`Uyarı: ${warning}`);
}
