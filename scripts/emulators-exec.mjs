import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const [only, ...command] = process.argv.slice(2);
if (!only || command.length === 0) {
  console.error("Kullanım: node scripts/emulators-exec.mjs <firestore,storage,...> <komut>");
  process.exit(1);
}

const env = { ...process.env };
delete env.JAVA_TOOL_OPTIONS;

const firebaseBin = fileURLToPath(
  new URL(`../node_modules/.bin/firebase${process.platform === "win32" ? ".cmd" : ""}`, import.meta.url),
);

const args = ["emulators:exec", "--only", only, "--project", "demo-kampusagi", command.join(" ")];
const child =
  process.platform === "win32"
    ? spawn([firebaseBin, ...args].map((part) => `"${part}"`).join(" "), { stdio: "inherit", env, shell: true })
    : spawn(firebaseBin, args, { stdio: "inherit", env });

child.on("exit", (code) => process.exit(code ?? 1));
