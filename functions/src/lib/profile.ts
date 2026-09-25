import type { DocumentReference, DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { appError } from "./errors";

type Read = (ref: DocumentReference) => Promise<DocumentSnapshot>;

export async function requireVerifiedProfile(firestore: Firestore, uid: string, read: Read = (ref) => ref.get()): Promise<string> {
  const profile = await read(firestore.doc(`users/${uid}`));
  const universityId = profile.get("universityId");
  if (!profile.exists || profile.get("verificationStatus") !== "verified" || typeof universityId !== "string") {
    throw appError("not-verified", "Bu işlem için öğrenci doğrulamanın tamamlanması gerekiyor.");
  }
  return universityId;
}

export type VerifiedActor = { uid: string; universityId: string };

/**
 * Yetki claim'den gelir (Rules ile aynı kaynak); profil yalnızca doğrulamanın hâlâ geçerli olduğunu teyit eder.
 * Claim ile profil ayrışmışsa (ör. token yenilenmemiş) işlem reddedilir.
 */
export async function requireVerifiedActor(firestore: Firestore, actor: VerifiedActor, read: Read = (ref) => ref.get()) {
  const universityId = await requireVerifiedProfile(firestore, actor.uid, read);
  if (universityId !== actor.universityId) {
    throw appError("not-verified", "Doğrulama bilgin güncel değil. Oturumunu kapatıp yeniden aç.");
  }
  return universityId;
}
