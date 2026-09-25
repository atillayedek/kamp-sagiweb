import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../apps/web/.next/static/", import.meta.url).pathname;
const forbidden = [
  { name: "Anthropic SDK", pattern: /@anthropic-ai\// },
  { name: "Anthropic API uç noktası", pattern: /api\.anthropic\.com/ },
  { name: "Anthropic anahtar biçimi", pattern: /sk-ant-[A-Za-z0-9_-]{8,}/ },
  { name: "Anthropic ortam değişkeni", pattern: /ANTHROPIC_API_KEY/ },
  { name: "Service account özel anahtarı", pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
];

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|mjs|css|json|html)$/.test(entry)) yield path;
  }
}

let scanned = 0;
const findings = [];
try {
  for (const file of files(root)) {
    scanned += 1;
    const content = readFileSync(file, "utf8");
    for (const rule of forbidden) if (rule.pattern.test(content)) findings.push(`${rule.name}: ${file}`);
  }
} catch {
  console.error("apps/web/.next/static bulunamadı. Önce `pnpm --filter @kampusagi/web build` çalıştır.");
  process.exit(1);
}

if (findings.length > 0) {
  console.error("İstemci paketinde yasaklı içerik bulundu:\n" + findings.join("\n"));
  process.exit(1);
}
console.log(`İstemci paketi temiz (${scanned} dosya tarandı).`);
