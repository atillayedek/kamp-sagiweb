import { COMMUNITY_LIMITS, type Visibility } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { Timestamp, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { appError } from "../lib/errors";
import { shortHash } from "../lib/hash";
import { requireVerifiedActor, type VerifiedActor } from "../lib/profile";
import { reserveDaily, type CommunityLimits } from "./limits";

export type CommunityDeps = {
  firestore: Firestore;
  limits: CommunityLimits;
  now?: () => Date;
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Yalnızca büyük/küçük harf, boşluk ve sık kullanılan ayraç farklarını yok sayar ("C++" ile "C#" farklı kalır). */
export function normalizeClubName(name: string): string {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[\s.,;:!?'"’“”()[\]{}\-_/\\|]+/gu, " ")
    .trim();
}

function clubNameRef(firestore: Firestore, universityId: string, name: string) {
  return firestore.doc(`clubNames/${shortHash(`${universityId}:${normalizeClubName(name)}`)}`);
}

function sameRequest(existing: DocumentSnapshot, fields: Record<string, unknown>) {
  return Object.entries(fields).every(([key, value]) => {
    const stored = existing.get(key) as unknown;
    return stored instanceof Timestamp ? stored.toMillis() === value : stored === value;
  });
}

export async function createClub(
  deps: CommunityDeps,
  actor: VerifiedActor,
  input: { clubId: string; name: string; description: string; visibility: Visibility },
): Promise<{ clubId: string }> {
  const { firestore } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const clubRef = firestore.doc(`clubs/${input.clubId}`);
  const fields = { name: input.name, description: input.description, visibility: input.visibility };
  const result = await firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(clubRef);
    if (existing.exists) {
      if (existing.get("founderUid") === actor.uid && sameRequest(existing, fields)) return { created: false };
      throw appError("already-exists", "Bu kimlikle farklı bir kulüp kurulmuş. Kulüp listesini kontrol et.");
    }
    const universityId = await requireVerifiedActor(firestore, actor, (ref) => transaction.get(ref));
    const nameRef = clubNameRef(firestore, universityId, input.name);
    if ((await transaction.get(nameRef)).exists) {
      throw appError("already-exists", "Üniversitende bu adla bir kulüp zaten var.");
    }
    const commit = await reserveDaily(transaction, { firestore, uid: actor.uid, now, counter: "clubs", limit: deps.limits.dailyClubs });
    const stamp = Timestamp.fromDate(now);
    transaction.create(clubRef, { ...fields, universityId, founderUid: actor.uid, memberCount: 0, createdAt: stamp });
    transaction.create(nameRef, { clubId: input.clubId, universityId, createdAt: stamp });
    transaction.create(clubRef.collection("members").doc(actor.uid), { joinedAt: stamp });
    commit();
    return { created: true };
  });
  if (result.created) logger.info("club.created", { clubId: input.clubId });
  return { clubId: input.clubId };
}

export async function createEvent(
  deps: CommunityDeps,
  actor: VerifiedActor,
  input: {
    eventId: string;
    title: string;
    description: string;
    location: string;
    startsAt: string;
    endsAt: string | null;
    visibility: Visibility;
  },
): Promise<{ eventId: string }> {
  const { firestore } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const startsAt = Date.parse(input.startsAt);
  const endsAt = input.endsAt ? Date.parse(input.endsAt) : null;
  const eventRef = firestore.doc(`events/${input.eventId}`);
  const fields = {
    title: input.title,
    description: input.description,
    location: input.location,
    startsAt,
    endsAt,
    visibility: input.visibility,
  };
  const result = await firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    if (existing.exists) {
      // Yanıtı kaybolan isteğin tekrarı: zaman sınırı artık geçmiş olsa da aynı etkinlik döner.
      if (existing.get("organizerUid") === actor.uid && sameRequest(existing, fields)) return { created: false };
      throw appError("already-exists", "Bu kimlikle farklı bir etkinlik oluşturulmuş. Etkinlik listesini kontrol et.");
    }
    if (startsAt < now.getTime() + COMMUNITY_LIMITS.eventMinLeadMinutes * MINUTE_MS) {
      throw appError("invalid-argument", `Etkinlik en az ${COMMUNITY_LIMITS.eventMinLeadMinutes} dakika sonra başlamalı.`);
    }
    if (startsAt > now.getTime() + COMMUNITY_LIMITS.eventMaxAheadDays * DAY_MS) {
      throw appError("invalid-argument", `Etkinlik en fazla ${COMMUNITY_LIMITS.eventMaxAheadDays} gün sonrası için oluşturulabilir.`);
    }
    const universityId = await requireVerifiedActor(firestore, actor, (ref) => transaction.get(ref));
    const commit = await reserveDaily(transaction, { firestore, uid: actor.uid, now, counter: "events", limit: deps.limits.dailyEvents });
    const stamp = Timestamp.fromDate(now);
    transaction.create(eventRef, {
      ...fields,
      startsAt: Timestamp.fromMillis(startsAt),
      endsAt: endsAt === null ? null : Timestamp.fromMillis(endsAt),
      universityId,
      organizerUid: actor.uid,
      attendeeCount: 0,
      createdAt: stamp,
    });
    transaction.create(eventRef.collection("attendees").doc(actor.uid), { joinedAt: stamp });
    commit();
    return { created: true };
  });
  if (result.created) logger.info("event.created", { eventId: input.eventId });
  return { eventId: input.eventId };
}

// Silme yanıtları var olmayan ile silme yetkisi olmayan belgeyi ayırt etmez (varlık yoklaması engellenir).

export async function deletePost(
  deps: { firestore: Firestore },
  uid: string,
  input: { postId: string },
): Promise<{ status: "deleted" | "missing" }> {
  const ref = deps.firestore.doc(`posts/${input.postId}`);
  const post = await ref.get();
  if (!post.exists || post.get("authorUid") !== uid) return { status: "missing" };
  await deps.firestore.recursiveDelete(ref);
  // Gönderi silindikten sonra Rules yeni yorum/beğeniye izin vermez; ilk tur sırasında eklenenleri temizle.
  await deps.firestore.recursiveDelete(ref);
  logger.info("post.deleted", { postId: input.postId });
  return { status: "deleted" };
}

export async function deleteComment(
  deps: { firestore: Firestore },
  uid: string,
  input: { postId: string; commentId: string },
): Promise<{ status: "deleted" | "missing" }> {
  const postRef = deps.firestore.doc(`posts/${input.postId}`);
  const commentRef = postRef.collection("comments").doc(input.commentId);
  const [post, comment] = await deps.firestore.getAll(postRef, commentRef);
  const byAuthor = comment!.get("authorUid") === uid;
  if (!comment!.exists || (!byAuthor && post!.get("authorUid") !== uid)) return { status: "missing" };
  await commentRef.delete();
  logger.info("comment.deleted", { postId: input.postId, byPostAuthor: !byAuthor });
  return { status: "deleted" };
}
