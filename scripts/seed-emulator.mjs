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
  const entries = Object.entries(universities);
  // Emulator'ı boğmadan hızlı yüklemek için 20'lik gruplar hâlinde yazılır.
  for (let index = 0; index < entries.length; index += 20) {
    await Promise.all(
      entries.slice(index, index + 20).map(([id, university]) => {
        const fields = Object.fromEntries(Object.entries(university).map(([key, value]) => [key, { stringValue: value }]));
        return request(`${documents}/universities/${id}`, { method: "PATCH", body: JSON.stringify({ fields }) });
      }),
    );
  }
  return entries.length;
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
  universityId = "orta-dogu-teknik",
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

export async function createNeed({
  id = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  authorUid,
  universityId,
  visibility = "campus",
  title,
  category = "spor",
  tags = [],
  requiredSkills = [],
  createdAt = new Date(),
  matchStatus = "pending",
  status = "open",
}) {
  await writeDocument(`needs/${id}`, {
    authorUid,
    universityId,
    visibility,
    rawText: title,
    parsed: {
      title,
      category,
      tags,
      requiredSkills,
      participants: { min: 1, max: 1 },
      when: { kind: "none", startIso: null, endIso: null, rawText: null },
      locationHint: null,
    },
    parseStatus: "parsed",
    edited: false,
    status,
    matchStatus,
    matchCount: 0,
    createdAt,
    updatedAt: createdAt,
  });
  return id;
}

export async function createSuggestedMatch({ needId, needAuthorUid, candidateUid, score, reasons }) {
  await writeDocument(`needs/${needId}/matches/${candidateUid}`, {
    candidateUid,
    needId,
    needAuthorUid,
    score,
    breakdown: { campus: null, category: null, tags: null, skills: null, department: null, reliability: null },
    reasons,
    weightsVersion: "e2e",
    status: "suggested",
    createdAt: new Date(),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await resetEmulators();
  console.log(`Emulator sıfırlandı; ${await seedUniversities()} demo üniversite yüklendi.`);
}
