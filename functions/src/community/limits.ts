import { zonedDayKey } from "@kampusagi/contracts";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { appError } from "../lib/errors";
import { rateLimitExpiry } from "../lib/rate-limit";

export type CommunityLimits = {
  dailyClubs: number;
  dailyEvents: number;
  dailyReports: number;
};

type Counter = "clubs" | "events" | "reports";

const MESSAGES: Record<Counter, string> = {
  clubs: "Bugün kurabileceğin kulüp sınırına ulaştın. Yarın tekrar dene.",
  events: "Bugün oluşturabileceğin etkinlik sınırına ulaştın. Yarın tekrar dene.",
  reports: "Bugün çok fazla bildirim gönderdin. Yarın tekrar dene.",
};

export function communityUsageRef(firestore: Firestore, uid: string, now: Date) {
  return firestore.doc(`rateLimits/community_${uid}_${zonedDayKey(now)}`);
}

export async function reserveDaily(
  transaction: Transaction,
  input: { firestore: Firestore; uid: string; now: Date; counter: Counter; limit: number },
) {
  const ref = communityUsageRef(input.firestore, input.uid, input.now);
  const usage = await transaction.get(ref);
  const used = (usage.get(input.counter) as number | undefined) ?? 0;
  if (used >= input.limit) throw appError("resource-exhausted", MESSAGES[input.counter]);
  return () =>
    transaction.set(
      ref,
      { [input.counter]: FieldValue.increment(1), expiresAt: rateLimitExpiry(input.now) },
      { merge: true },
    );
}
