import { spawn } from "node:child_process";

const separator = process.argv.indexOf("--");
if (separator === -1) {
  console.error("Kullanım: node scripts/run-with-env.mjs AD=değer ... -- komut");
  process.exit(1);
}

const assignments = process.argv.slice(2, separator);
const [command, ...args] = process.argv.slice(separator + 1);
const env = { ...process.env };
for (const assignment of assignments) {
  const index = assignment.indexOf("=");
  env[assignment.slice(0, index)] = assignment.slice(index + 1);
}

const child = spawn(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 1));
