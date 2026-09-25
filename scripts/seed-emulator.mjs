import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const projectId = "demo-kampusagi";
const firestore = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}`;
const auth = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
const documents = `${firestore}/v1/projects/${projectId}/databases/(default)/documents`;

async function request(url, init) {
  const response = await fetch(url, { ...init, headers: { Authorization: "Bearer owner", "Content-Type": "application/json" } });
  if (!response.ok) throw new Error(`${init.method} ${url} → ${response.status} ${await response.text()}`);
}

export async function resetEmulators() {
  await request(`${firestore}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: "DELETE" });
  await request(`${auth}/emulator/v1/projects/${projectId}/accounts`, { method: "DELETE" });
}

export async function seedUniversities() {
  const { universities } = JSON.parse(readFileSync(new URL("../firebase/seed/universities.json", import.meta.url), "utf8"));
  for (const [id, university] of Object.entries(universities)) {
    const fields = Object.fromEntries(Object.entries(university).map(([key, value]) => [key, { stringValue: value }]));
    await request(`${documents}/universities/${id}`, { method: "PATCH", body: JSON.stringify({ fields }) });
  }
  return Object.keys(universities).length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await resetEmulators();
  console.log(`Emulator sıfırlandı; ${await seedUniversities()} demo üniversite yüklendi.`);
}
