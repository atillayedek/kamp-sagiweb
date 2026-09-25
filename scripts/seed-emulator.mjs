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

export async function createUser({ email, password, claims }) {
  const response = await fetch(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Kullanıcı oluşturulamadı: ${response.status} ${await response.text()}`);
  const { localId } = await response.json();
  if (claims) {
    await request(`${auth}/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
      method: "POST",
      body: JSON.stringify({ localId, customAttributes: JSON.stringify(claims) }),
    });
  }
  return localId;
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { mapValue: { fields: firestoreFields(value) } };
}

function firestoreFields(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, firestoreValue(value)]));
}

export async function writeDocument(path, data) {
  await request(`${documents}/${path}`, { method: "PATCH", body: JSON.stringify({ fields: firestoreFields(data) }) });
}

export async function createVerifiedStudent({
  email,
  password,
  displayName,
  universityId = "odtu",
  department = "Bilgisayar Mühendisliği",
  interests = ["basketbol"],
  skills = ["python"],
}) {
  const uid = await createUser({ email, password, claims: { verified: true, universityId } });
  const now = new Date();
  await writeDocument(`users/${uid}`, {
    displayName,
    universityId,
    department,
    interests,
    skills,
    bio: "",
    verificationStatus: "verified",
    reputationScore: null,
    createdAt: now,
    updatedAt: now,
  });
  await writeDocument(`userPrivate/${uid}`, {
    legal: { acceptedTermsVersion: "2026-09-taslak", acceptedAt: now },
    privacy: { profileVisibility: "campus" },
    messaging: { allowFrom: "campus" },
    createdAt: now,
  });
  return uid;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await resetEmulators();
  console.log(`Emulator sıfırlandı; ${await seedUniversities()} demo üniversite yüklendi.`);
}
