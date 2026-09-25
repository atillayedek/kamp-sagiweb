import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { shortHash } from "../lib/hash";

export const COUNTED_COLLECTIONS = {
  likes: { parent: "posts", field: "likeCount" },
  comments: { parent: "posts", field: "commentCount" },
  members: { parent: "clubs", field: "memberCount" },
  attendees: { parent: "events", field: "attendeeCount" },
} as const;

export type CountedCollection = keyof typeof COUNTED_COLLECTIONS;

export type CounterOutcome = "applied" | "duplicate" | "orphan" | "stale" | "ignored";

// Tetikleyici en fazla 1 saat yeniden denenir; işaretin bu süreden uzun yaşaması yeterli.
const MARKER_TTL_MS = 6 * 60 * 60 * 1000;

export function counterDelta(before: boolean, after: boolean): -1 | 0 | 1 {
  if (!before && after) return 1;
  if (before && !after) return -1;
  return 0;
}

export async function applyCounterEvent(
  deps: { firestore: Firestore; now?: () => Date },
  input: {
    eventId: string;
    collection: CountedCollection;
    parentId: string;
    delta: -1 | 0 | 1;
    /** Alt belgenin oluşturulma zamanı (ms). Üst belgeden eskiyse olay, aynı kimlikle yeniden oluşturulmuş üst belgeye ait değildir. */
    childCreatedAt: number | null;
  },
): Promise<CounterOutcome> {
  if (input.delta === 0) return "ignored";
  const { firestore } = deps;
  const { parent, field } = COUNTED_COLLECTIONS[input.collection];
  const parentRef = firestore.doc(`${parent}/${input.parentId}`);
  const markerRef = firestore.doc(`counterEvents/${shortHash(input.eventId)}`);
  const now = (deps.now ?? (() => new Date()))();
  return firestore.runTransaction(async (transaction) => {
    const [marker, target] = await Promise.all([transaction.get(markerRef), transaction.get(parentRef)]);
    if (marker.exists) return "duplicate";
    if (!target.exists) return "orphan";
    const parentCreatedAt = target.createTime?.toMillis() ?? null;
    if (input.childCreatedAt !== null && parentCreatedAt !== null && input.childCreatedAt < parentCreatedAt) return "stale";
    transaction.update(parentRef, { [field]: FieldValue.increment(input.delta) });
    transaction.create(markerRef, { expiresAt: Timestamp.fromMillis(now.getTime() + MARKER_TTL_MS) });
    return "applied";
  });
}
