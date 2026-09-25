import {
  PDF_SIGNATURE_LENGTH,
  verificationStoragePath,
  type RejectReason,
} from "@kampusagi/contracts";
import type { Auth } from "firebase-admin/auth";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { Bucket } from "../lib/admin";
import { appError } from "../lib/errors";
import { fileProblemMessages, inspectVerificationFile } from "./file";
import { purgeDateFrom } from "./retention";

export async function submitVerification(
  deps: { firestore: Firestore; bucket: Bucket },
  uid: string,
  requestId: string,
): Promise<{ status: "pending" }> {
  const path = verificationStoragePath(uid, requestId);
  const file = deps.bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) throw appError("failed-precondition", "Belge bulunamadı. Lütfen yeniden yükle.");
  const [metadata] = await file.getMetadata();
  const [header] = await file.download({ start: 0, end: PDF_SIGNATURE_LENGTH - 1 });
  const problem = inspectVerificationFile({
    contentType: metadata.contentType,
    size: Number(metadata.size),
    header: new Uint8Array(header),
  });
  if (problem) {
    await file.delete({ ignoreNotFound: true });
    throw appError("invalid-argument", fileProblemMessages[problem]);
  }

  try {
    return await createPendingRequest(deps.firestore, uid, requestId, path);
  } catch (error) {
    await file.delete({ ignoreNotFound: true });
    throw error;
  }
}

async function createPendingRequest(firestore: Firestore, uid: string, requestId: string, storagePath: string) {
  const userRef = firestore.doc(`users/${uid}`);
  const requestRef = firestore.doc(`verificationRequests/${requestId}`);
  const privateRef = firestore.doc(`userPrivate/${uid}`);
  return firestore.runTransaction(async (transaction) => {
    const [user, existing] = await Promise.all([transaction.get(userRef), transaction.get(requestRef)]);
    if (existing.exists) {
      if (existing.get("uid") === uid && existing.get("status") === "pending") return { status: "pending" as const };
      throw appError("already-exists", "Bu başvuru zaten kayıtlı.");
    }
    if (!user.exists) throw appError("failed-precondition", "Önce profilini oluşturmalısın.");
    const status = user.get("verificationStatus");
    if (status === "pending") throw appError("failed-precondition", "İncelenmeyi bekleyen bir belgen zaten var.");
    if (status === "verified") throw appError("failed-precondition", "Öğrenci doğrulaman zaten tamamlanmış.");
    const now = FieldValue.serverTimestamp();
    transaction.create(requestRef, {
      uid,
      universityId: user.get("universityId"),
      storagePath,
      status: "pending",
      rejectReason: null,
      note: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
      purgeAt: null,
    });
    transaction.update(userRef, { verificationStatus: "pending", updatedAt: now });
    transaction.set(
      privateRef,
      { verification: { requestId, status: "pending", rejectReason: null, note: null, updatedAt: now } },
      { merge: true },
    );
    return { status: "pending" as const };
  });
}

export async function grantVerifiedClaims(auth: Auth, uid: string, universityId: string) {
  const current = (await auth.getUser(uid)).customClaims ?? {};
  if (current.verified === true && current.universityId === universityId) return;
  await auth.setCustomUserClaims(uid, { ...current, verified: true, universityId });
}

export async function revokeVerifiedClaims(auth: Auth, uid: string) {
  const current = (await auth.getUser(uid)).customClaims ?? {};
  if (current.verified === undefined && current.universityId === undefined) return;
  const { verified: _verified, universityId: _universityId, ...rest } = current;
  await auth.setCustomUserClaims(uid, rest);
  await auth.revokeRefreshTokens(uid);
}

export async function syncVerificationClaims(
  deps: { firestore: Firestore; auth: Auth },
  uid: string,
): Promise<{ verified: boolean }> {
  const profile = await deps.firestore.doc(`users/${uid}`).get();
  if (profile.exists && profile.get("verificationStatus") === "verified") {
    await grantVerifiedClaims(deps.auth, uid, profile.get("universityId") as string);
    return { verified: true };
  }
  await revokeVerifiedClaims(deps.auth, uid);
  return { verified: false };
}

type ReviewInput = {
  requestId: string;
  decision: "approve" | "reject";
  rejectReason?: RejectReason;
  note?: string;
};

export async function reviewVerification(
  deps: { firestore: Firestore; auth: Auth; now?: () => Date },
  moderatorUid: string,
  input: ReviewInput,
): Promise<{ status: "approved" | "rejected" }> {
  const now = deps.now ?? (() => new Date());
  const requestRef = deps.firestore.doc(`verificationRequests/${input.requestId}`);
  const snapshot = await requestRef.get();
  if (!snapshot.exists) throw appError("not-found", "Başvuru bulunamadı.");
  const targetUid = snapshot.get("uid") as string;
  const universityId = snapshot.get("universityId") as string;
  const outcome = input.decision === "approve" ? "approved" : "rejected";
  if (targetUid === moderatorUid) throw appError("permission-denied", "Kendi başvurunu inceleyemezsin.");
  if (snapshot.get("status") !== "pending") {
    if (snapshot.get("status") !== outcome) throw appError("failed-precondition", "Bu başvuru zaten sonuçlandırılmış.");
    if (outcome === "approved") await grantVerifiedClaims(deps.auth, targetUid, universityId);
    return { status: outcome };
  }

  const decidedAt = now();
  const rejectReason = outcome === "rejected" ? (input.rejectReason ?? "other") : null;
  const note = input.note?.trim() || null;
  await deps.firestore.runTransaction(async (transaction) => {
    const current = await transaction.get(requestRef);
    if (current.get("status") !== "pending") throw appError("failed-precondition", "Bu başvuru zaten sonuçlandırılmış.");
    const reviewedAt = Timestamp.fromDate(decidedAt);
    transaction.update(requestRef, {
      status: outcome,
      rejectReason,
      note,
      reviewedBy: moderatorUid,
      reviewedAt,
      purgeAt: Timestamp.fromDate(purgeDateFrom(decidedAt)),
    });
    transaction.update(deps.firestore.doc(`users/${targetUid}`), {
      verificationStatus: outcome === "approved" ? "verified" : "rejected",
      updatedAt: reviewedAt,
    });
    transaction.set(
      deps.firestore.doc(`userPrivate/${targetUid}`),
      { verification: { requestId: input.requestId, status: outcome, rejectReason, note, updatedAt: reviewedAt } },
      { merge: true },
    );
    transaction.create(deps.firestore.collection("moderationLogs").doc(), {
      action: outcome === "approved" ? "verification.approve" : "verification.reject",
      actorUid: moderatorUid,
      targetUid,
      targetRef: requestRef.path,
      reason: rejectReason,
      createdAt: reviewedAt,
    });
  });
  if (outcome === "approved") await grantVerifiedClaims(deps.auth, targetUid, universityId);
  return { status: outcome };
}

export async function purgeExpiredVerificationFiles(
  deps: { firestore: Firestore; bucket: Bucket },
  now: Date,
  batchSize = 200,
): Promise<number> {
  const due = await deps.firestore
    .collection("verificationRequests")
    .where("purgeAt", "<=", Timestamp.fromDate(now))
    .limit(batchSize)
    .get();
  for (const document of due.docs) {
    await deps.bucket.file(document.get("storagePath") as string).delete({ ignoreNotFound: true });
    await document.ref.update({ purgeAt: FieldValue.delete(), fileDeletedAt: Timestamp.fromDate(now) });
  }
  return due.size;
}

const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_FILE = /^verification\/([^/]+)\/([A-Za-z0-9_-]{8,64})\.pdf$/;

export async function purgeOrphanVerificationFiles(
  deps: { firestore: Firestore; bucket: Bucket },
  now: Date,
  graceMs = ORPHAN_GRACE_MS,
): Promise<number> {
  let deleted = 0;
  let pageToken: string | undefined;
  do {
    const [files, next] = await deps.bucket.getFiles({ prefix: "verification/", autoPaginate: false, maxResults: 500, pageToken });
    for (const file of files) {
      const created = Date.parse(String(file.metadata.timeCreated ?? ""));
      if (Number.isFinite(created) && now.getTime() - created < graceMs) continue;
      const match = VERIFICATION_FILE.exec(file.name);
      const request = match ? await deps.firestore.doc(`verificationRequests/${match[2]}`).get() : null;
      if (request?.exists && request.get("uid") === match?.[1]) continue;
      await file.delete({ ignoreNotFound: true });
      deleted += 1;
    }
    pageToken = (next as { pageToken?: string } | null)?.pageToken;
  } while (pageToken);
  return deleted;
}
