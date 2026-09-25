import { zonedDayKey } from "@kampusagi/contracts";
import { logger } from "firebase-functions";
import { FieldValue, Timestamp, type DocumentReference, type Firestore } from "firebase-admin/firestore";

export const TOKEN_SHARDS = 10;

export const TOKENS_RESERVED_PER_PARSE = 40_000;

const TTL_MS = 48 * 60 * 60 * 1000;

export type TokenReservation = { ref: DocumentReference; reserved: number };

export function tokenShardRefs(firestore: Firestore, now: Date): DocumentReference[] {
  const day = zonedDayKey(now);
  return Array.from({ length: TOKEN_SHARDS }, (_, shard) => firestore.doc(`rateLimits/aiTokens_${day}_${shard}`));
}

export async function reserveTokens(
  firestore: Firestore,
  now: Date,
  dailyBudget: number,
  amount = TOKENS_RESERVED_PER_PARSE,
  random = Math.random,
): Promise<TokenReservation | null> {
  const shards = tokenShardRefs(firestore, now);
  const perShard = Math.floor(dailyBudget / TOKEN_SHARDS);
  const first = Math.floor(random() * TOKEN_SHARDS);
  const second = (first + 1 + Math.floor(random() * (TOKEN_SHARDS - 1))) % TOKEN_SHARDS;
  const expiresAt = Timestamp.fromMillis(now.getTime() + TTL_MS);
  for (const ref of [shards[first]!, shards[second]!]) {
    const reserved = await firestore.runTransaction(async (transaction) => {
      const used = ((await transaction.get(ref)).get("tokens") as number | undefined) ?? 0;
      if (used + amount > perShard) return false;
      transaction.set(ref, { tokens: FieldValue.increment(amount), expiresAt }, { merge: true });
      return true;
    });
    if (reserved) return { ref, reserved: amount };
  }
  return null;
}

export async function settleTokens(reservation: TokenReservation, actual: number) {
  const delta = actual - reservation.reserved;
  if (delta === 0) return;
  try {
    await reservation.ref.set({ tokens: FieldValue.increment(delta) }, { merge: true });
  } catch (error) {
    logger.warn("needs.tokens.settleFailed", { errorName: error instanceof Error ? error.name : "unknown", delta });
  }
}
