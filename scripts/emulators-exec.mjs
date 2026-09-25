import { spawn } from "node:child_process";

const [only, ...command] = process.argv.slice(2);
if (!only || command.length === 0) {
  console.error("Kullanım: node scripts/emulators-exec.mjs <firestore,storage,...> <komut>");
  process.exit(1);
}

const env = { ...process.env };
delete env.JAVA_TOOL_OPTIONS;

const child = spawn(
  "firebase",
  ["emulators:exec", "--only", only, "--project", "demo-kampusagi", command.join(" ")],
  { stdio: "inherit", env, shell: process.platform === "win32" },
);

child.on("exit", (code) => process.exit(code ?? 1));
