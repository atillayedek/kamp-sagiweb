import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

for (const file of readdirSync(".").filter((name) => name.startsWith(".env"))) {
  if (/^\s*FUNCTIONS_EMULATOR\s*=/m.test(readFileSync(file, "utf8"))) {
    console.error(`${file}: FUNCTIONS_EMULATOR tanımlanamaz; App Check korumasını devre dışı bırakır.`);
    process.exit(1);
  }
}

await build({
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  alias: { "@kampusagi/contracts": fileURLToPath(new URL("../packages/contracts/src/index.ts", import.meta.url)) },
  external: ["@anthropic-ai/sdk", "firebase-admin", "firebase-admin/*", "firebase-functions", "firebase-functions/*", "zod"],
  logLevel: "info",
});
