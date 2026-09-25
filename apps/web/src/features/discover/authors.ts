import { publicProfileSchema } from "@kampusagi/contracts";
import type { NeedCardData } from "@/components/need/NeedCard";
import { toAppError } from "@/connectors/errors";
import type { DocumentSource } from "@/connectors/types";

export type AuthorView = NeedCardData["author"];

export type AuthorRef = { uid: string; universityId: string | null };

export const OTHER_CAMPUS_AUTHOR: AuthorView = {
  name: "Doğrulanmış öğrenci",
  department: "Başka bir üniversite",
  verified: true,
};

export const UNKNOWN_AUTHOR: AuthorView = { name: "Öğrenci", department: "Profil bilgisi alınamadı", verified: false };

export async function loadAuthors(
  documents: DocumentSource,
  refs: AuthorRef[],
  viewerUniversityId: string,
  known: ReadonlyMap<string, AuthorView> = new Map(),
): Promise<Map<string, AuthorView>> {
  const result = new Map(known);
  const pending: string[] = [];
  const unknownCampus = new Set<string>();
  for (const ref of refs) {
    if (result.has(ref.uid) || pending.includes(ref.uid)) continue;
    if (ref.universityId !== null && ref.universityId !== viewerUniversityId) {
      result.set(ref.uid, OTHER_CAMPUS_AUTHOR);
      continue;
    }
    if (ref.universityId === null) unknownCampus.add(ref.uid);
    pending.push(ref.uid);
  }
  const profiles = await Promise.allSettled(pending.map((uid) => documents.getDocument(`users/${uid}`, publicProfileSchema)));
  pending.forEach((uid, index) => {
    const profile = profiles[index]!;
    if (profile.status === "fulfilled" && profile.value) {
      const { displayName, department, verificationStatus } = profile.value;
      result.set(uid, { name: displayName, department, verified: verificationStatus === "verified" });
      return;
    }
    const denied = profile.status === "rejected" && toAppError(profile.reason).code === "permission-denied";
    result.set(uid, denied && unknownCampus.has(uid) ? OTHER_CAMPUS_AUTHOR : UNKNOWN_AUTHOR);
  });
  return result;
}
